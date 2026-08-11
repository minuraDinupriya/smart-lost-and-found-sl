const Tip = require('../models/Tip');
const ReturnRecord = require('../models/ReturnRecord');
const Notification = require('../models/Notification');
const paymentService = require('../services/payment.service');
const { emitGlobalNotification } = require('../services/socket.service');
const User = require('../models/User');

/**
 * Helper to verify all tip eligibility conditions on the backend.
 */
const checkTipEligibility = async (returnRecord, userId) => {
  if (!returnRecord) {
    return { eligible: false, reason: 'Return record not found.' };
  }
  
  if (!returnRecord.itemId) {
    return { eligible: false, reason: 'Associated item not found.' };
  }

  // Handle populated or unpopulated ownerId and finderId
  const ownerIdString = returnRecord.ownerId._id ? returnRecord.ownerId._id.toString() : returnRecord.ownerId.toString();
  const finderIdString = returnRecord.finderId._id ? returnRecord.finderId._id.toString() : returnRecord.finderId.toString();

  // 1. Logged in user must be the rightful owner
  if (ownerIdString !== userId.toString()) {
    return { eligible: false, reason: 'Only the rightful owner can give a tip.' };
  }

  // 2. Finder must be a valid user and not the owner itself
  if (ownerIdString === finderIdString) {
    return { eligible: false, reason: 'You cannot give a tip to yourself.' };
  }

  const finder = await User.findById(finderIdString);
  if (!finder) {
    return { eligible: false, reason: 'The finder user does not exist.' };
  }

  // 3. Handover status must be successfully completed (Mutual Verification Protocol)
  if (returnRecord.status !== 'RETURN_COMPLETED' && returnRecord.status !== 'Returned' && returnRecord.status !== 'Completed') {
    return { eligible: false, reason: 'Handover status is not completed.' };
  }

  // Ensure mutual verification actually occurred (Security against forced statuses)
  if (returnRecord.status === 'RETURN_COMPLETED') {
    if (!returnRecord.finderConfirmedAt || !returnRecord.ownerConfirmedAt || !returnRecord.ownerReceivedAt) {
      return { eligible: false, reason: 'Mutual verification steps are incomplete. Both parties must confirm.' };
    }
  }

  // 4. Item status must be successfully claimed/returned
  if (returnRecord.itemId.status !== 'Claimed') {
    return { eligible: false, reason: 'The item has not been marked as Claimed/Returned.' };
  }

  // 5. No completed tip already exists
  const existingTip = await Tip.findOne({ 
    returnRecordId: returnRecord._id, 
    paymentStatus: { $in: ['paid', 'completed'] } 
  });
  if (existingTip) {
    return { eligible: false, reason: 'A tip has already been paid for this return.' };
  }

  return { eligible: true, reason: '' };
};

/**
 * Creates a new Tip record (or updates an existing pending one) and initiates payment.
 */
const createTip = async (req, res) => {
  try {
    const { returnRecordId, amount, thankYouMessage } = req.body;

    // 1. Basic validation
    if (!returnRecordId) {
      return res.status(400).json({ message: 'Return record ID is required.' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }

    // 2. Fetch ReturnRecord and verify existence
    const returnRecord = await ReturnRecord.findById(returnRecordId).populate('itemId');
    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found.' });
    }

    // 3. Security eligibility check on the backend
    const eligibility = await checkTipEligibility(returnRecord, req.userId);
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason });
    }

    // 4. If no tip exists, create one. If a pending one exists, update it.
    let tip = await Tip.findOne({ returnRecordId });
    if (!tip) {
      tip = new Tip({
        returnRecordId,
        ownerId: returnRecord.ownerId,
        finderId: returnRecord.finderId,
        amount: parseFloat(amount),
        thankYouMessage: thankYouMessage || '',
        paymentStatus: 'pending',
      });
    } else {
      tip.amount = parseFloat(amount);
      tip.thankYouMessage = thankYouMessage || '';
      tip.paymentStatus = 'pending';
      tip.paymentReference = ''; // Reset reference for retry
    }

    await tip.save();

    // 5. Initiate Payment Checkout Session (Returns PayHere Config)
    const hostUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
    const paymentSession = await paymentService.createCheckoutSession(tip, hostUrl);

    // Save payment reference
    tip.paymentReference = paymentSession.reference;
    await tip.save();

    res.status(200).json({
      message: 'Payment session created successfully.',
      tip,
      checkoutUrl: paymentSession.url,
      payhereConfig: paymentSession.payhereConfig,
      isMock: paymentSession.isMock,
    });
  } catch (error) {
    console.error('Create tip error:', error);
    res.status(500).json({ message: 'Server error while initiating tip.' });
  }
};

/**
 * Retrieves details of a single tip. Restricted to owner or finder.
 */
const getTipById = async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id)
      .populate('ownerId', 'username')
      .populate('finderId', 'username')
      .populate({
        path: 'returnRecordId',
        populate: { path: 'itemId', select: 'title imageUrl' }
      });

    if (!tip) {
      return res.status(404).json({ message: 'Tip record not found.' });
    }

    // Security: Only owner (sender) or finder (receiver) can view
    if (tip.ownerId._id.toString() !== req.userId && tip.finderId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to view this tip details.' });
    }

    res.status(200).json(tip);
  } catch (error) {
    console.error('Get tip by ID error:', error);
    res.status(500).json({ message: 'Server error retrieving tip.' });
  }
};

/**
 * Retrieves a user's sent and received paid tips.
 */
const getUserTips = async (req, res) => {
  try {
    const userId = req.params.id;

    // Security: Users can only query their own tip history
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to access this user\'s tip logs.' });
    }

    // Retrieve tips where user is the sender (owner) and status is paid
    const sent = await Tip.find({ ownerId: userId, paymentStatus: 'paid' })
      .populate('finderId', 'username')
      .populate({
        path: 'returnRecordId',
        populate: { path: 'itemId', select: 'title imageUrl type' }
      })
      .sort({ createdAt: -1 });

    // Retrieve tips where user is the receiver (finder) and status is paid
    const received = await Tip.find({ finderId: userId, paymentStatus: 'paid' })
      .populate('ownerId', 'username')
      .populate({
        path: 'returnRecordId',
        populate: { path: 'itemId', select: 'title imageUrl type' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ sent, received });
  } catch (error) {
    console.error('Get user tips error:', error);
    res.status(500).json({ message: 'Server error retrieving user tip history.' });
  }
};

/**
 * Verifies and updates payment status.
 */
const updateTipPaymentStatus = async (req, res) => {
  try {
    const { paymentReference } = req.body;

    if (!paymentReference) {
      return res.status(400).json({ message: 'Payment reference is required.' });
    }

    const tip = await Tip.findOne({ paymentReference });
    if (!tip) {
      return res.status(404).json({ message: 'Tip record not found for this reference.' });
    }

    // If already paid, just return success
    if (tip.paymentStatus === 'paid') {
      return res.status(200).json({ message: 'Payment already verified.', tip });
    }

    // Call payment service to check status
    const verification = await paymentService.verifyPayment(paymentReference, tip);

    if (verification.status === 'paid') {
      tip.paymentStatus = 'paid';
      await tip.save();

      // Retrieve owner and finder info to build messages
      const owner = await User.findById(tip.ownerId);
      const finder = await User.findById(tip.finderId);
      const returnRec = await ReturnRecord.findById(tip.returnRecordId).populate('itemId');
      const itemTitle = returnRec?.itemId?.title || 'Returned Item';

      // Check for Bank Details and Handle Payout
      let finderMessage = '';
      if (finder.bankDetails && finder.bankDetails.accountNumber) {
        // Initiate payout immediately
        const payoutResult = await paymentService.initiatePayout(tip, finder);
        if (payoutResult.status === 'completed') {
          tip.payoutStatus = 'completed';
          finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'} for "${itemTitle}"! The money has been transferred to your bank account.`;
        } else {
          tip.payoutStatus = 'pending';
          finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'}! We had trouble transferring it to your bank. Please check your bank details in your profile.`;
        }
      } else {
        // Hold in escrow
        tip.payoutStatus = 'pending';
        finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'} for "${itemTitle}"! Please add your bank details in your Profile to receive the money.`;
      }
      
      await tip.save();

      // 1. Notify Finder (Receiver)
      const finderNotification = await Notification.create({
        userId: tip.finderId,
        message: finderMessage,
        type: 'TIP_RECEIVED',
      });

      // Send Real-Time Socket
      emitGlobalNotification(tip.finderId, {
        _id: finderNotification._id,
        text: finderMessage,
        type: 'TIP_RECEIVED',
        createdAt: finderNotification.createdAt,
      });

      // 2. Notify Owner (Sender)
      const ownerMessage = `Your reward tip of Rs. ${tip.amount} to @${finder?.username || 'Finder'} for "${itemTitle}" was sent successfully.`;
      const ownerNotification = await Notification.create({
        userId: tip.ownerId,
        message: ownerMessage,
        type: 'TIP_SENT',
      });

      // Send Real-Time Socket
      emitGlobalNotification(tip.ownerId, {
        _id: ownerNotification._id,
        text: ownerMessage,
        type: 'TIP_SENT',
        createdAt: ownerNotification.createdAt,
      });

      return res.status(200).json({ message: 'Payment verified and notifications sent.', tip });
    } else if (verification.status === 'failed') {
      tip.paymentStatus = 'failed';
      await tip.save();
      return res.status(400).json({ message: 'Payment verification failed.', tip });
    }

    res.status(200).json({ message: 'Payment is still pending.', tip });
  } catch (error) {
    console.error('Verify payment status error:', error);
    res.status(500).json({ message: 'Server error during payment verification.' });
  }
};

const getReturnRecordById = async (req, res) => {
  try {
    const returnRecord = await ReturnRecord.findById(req.params.id)
      .populate('itemId')
      .populate('ownerId', 'username')
      .populate('finderId', 'username');

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found.' });
    }

    // Security check: Only the owner (sender of the tip) or finder (receiver of the tip) can see it
    if (returnRecord.ownerId._id.toString() !== req.userId && returnRecord.finderId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to view this return record.' });
    }

    // Backend independently verifies all eligibility conditions
    const eligibility = await checkTipEligibility(returnRecord, req.userId);

    const recordObj = returnRecord.toObject();
    recordObj.isEligible = eligibility.eligible;
    recordObj.ineligibilityReason = eligibility.reason;

    res.status(200).json(recordObj);
  } catch (error) {
    console.error('Get return record by ID error:', error);
    res.status(500).json({ message: 'Server error retrieving return record.' });
  }
};

/**
 * Logs a skipped tip status in the database.
 */
const skipTip = async (req, res) => {
  try {
    const { returnRecordId } = req.body;
    if (!returnRecordId) {
      return res.status(400).json({ message: 'Return record ID is required.' });
    }

    const returnRecord = await ReturnRecord.findById(returnRecordId).populate('itemId');
    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found.' });
    }

    // Verify eligibility before saving skipped status
    const eligibility = await checkTipEligibility(returnRecord, req.userId);
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason });
    }

    let tip = await Tip.findOne({ returnRecordId });
    if (!tip) {
      tip = new Tip({
        returnRecordId,
        ownerId: returnRecord.ownerId,
        finderId: returnRecord.finderId,
        amount: 0,
        paymentStatus: 'skipped',
      });
    } else {
      tip.paymentStatus = 'skipped';
      tip.amount = 0;
    }

    await tip.save();
    res.status(200).json({ message: 'Tip successfully marked as skipped.', tip });
  } catch (error) {
    console.error('Skip tip error:', error);
    res.status(500).json({ message: 'Server error while skipping tip.' });
  }
};

/**
 * PayHere IPN Webhook
 * This is called asynchronously by PayHere servers when a payment completes
 */
const payhereNotify = async (req, res) => {
  try {
    const isValid = paymentService.verifyPayHereIPN(req.body);
    if (!isValid) {
      console.warn('Invalid PayHere IPN signature');
      return res.status(400).send('Invalid Signature');
    }

    const { order_id, status_code } = req.body;
    
    // Status Code 2 means success
    if (status_code !== '2') {
      return res.status(200).send('Status not successful, ignored.');
    }

    const tip = await Tip.findOne({ paymentReference: order_id });
    if (!tip) {
      console.warn(`PayHere IPN tip not found for order: ${order_id}`);
      return res.status(404).send('Tip not found');
    }

    if (tip.paymentStatus === 'paid') {
      return res.status(200).send('Already processed');
    }

    tip.paymentStatus = 'paid';
    await tip.save();

    // Trigger Payout Escrow logic (same as old verify logic)
    const owner = await User.findById(tip.ownerId);
    const finder = await User.findById(tip.finderId);
    const returnRec = await ReturnRecord.findById(tip.returnRecordId).populate('itemId');
    const itemTitle = returnRec?.itemId?.title || 'Returned Item';

    let finderMessage = '';
    if (finder.bankDetails && finder.bankDetails.accountNumber) {
      const payoutResult = await paymentService.initiatePayout(tip, finder);
      if (payoutResult.status === 'completed') {
        tip.payoutStatus = 'completed';
        finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'} for "${itemTitle}"! The money has been transferred to your bank account.`;
      } else {
        tip.payoutStatus = 'pending';
        finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'}! We had trouble transferring it to your bank. Please check your bank details in your profile.`;
      }
    } else {
      tip.payoutStatus = 'pending';
      finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${owner?.username || 'Owner'} for "${itemTitle}"! Please add your bank details in your Profile to receive the money.`;
    }
    await tip.save();

    const finderNotification = await Notification.create({
      userId: tip.finderId,
      message: finderMessage,
      type: 'TIP_RECEIVED',
    });
    emitGlobalNotification(tip.finderId, {
      _id: finderNotification._id,
      text: finderMessage,
      type: 'TIP_RECEIVED',
      createdAt: finderNotification.createdAt,
    });

    const ownerMessage = `Your reward tip of Rs. ${tip.amount} to @${finder?.username || 'Finder'} for "${itemTitle}" was sent successfully.`;
    const ownerNotification = await Notification.create({
      userId: tip.ownerId,
      message: ownerMessage,
      type: 'TIP_SENT',
    });
    emitGlobalNotification(tip.ownerId, {
      _id: ownerNotification._id,
      text: ownerMessage,
      type: 'TIP_SENT',
      createdAt: ownerNotification.createdAt,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('PayHere Notify Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  createTip,
  getTipById,
  getUserTips,
  updateTipPaymentStatus,
  getReturnRecordById,
  skipTip,
  payhereNotify,
};

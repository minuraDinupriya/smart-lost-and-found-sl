const Tip = require('../models/Tip');
const ReturnRecord = require('../models/ReturnRecord');
const Notification = require('../models/Notification');
const paymentService = require('../services/payment.service');
const { emitGlobalNotification } = require('../services/socket.service');
const User = require('../models/User');

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

    // 3. Security: Only the verified owner can create a tip
    if (returnRecord.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the verified owner can create a tip for this item.' });
    }

    // 4. Duplicate checks: Only one PAID tip allowed per completed return
    let tip = await Tip.findOne({ returnRecordId });
    if (tip && tip.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'A tip has already been paid for this return record.' });
    }

    // 5. If no tip exists, create one. If a pending one exists, update it.
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
    }

    await tip.save();

    // 6. Initiate Payment Checkout Session
    const hostUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
    const paymentSession = await paymentService.createCheckoutSession(tip, hostUrl);

    // Save payment reference
    tip.paymentReference = paymentSession.reference;
    await tip.save();

    res.status(200).json({
      message: 'Payment session created successfully.',
      tip,
      checkoutUrl: paymentSession.url,
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
    const verification = await paymentService.verifyPayment(paymentReference);

    if (verification.status === 'paid') {
      tip.paymentStatus = 'paid';
      await tip.save();

      // Retrieve owner and finder info to build messages
      const owner = await User.findById(tip.ownerId);
      const finder = await User.findById(tip.finderId);
      const returnRec = await ReturnRecord.findById(tip.returnRecordId).populate('itemId');
      const itemTitle = returnRec?.itemId?.title || 'Returned Item';

      // 1. Notify Finder (Receiver)
      const finderMessage = `You received a reward tip of Rs. ${tip.amount} from @${owner?.username || 'Owner'} for returning "${itemTitle}"!`;
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

module.exports = {
  createTip,
  getTipById,
  getUserTips,
  updateTipPaymentStatus,
};

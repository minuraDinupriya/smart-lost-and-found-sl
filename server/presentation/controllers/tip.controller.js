const tipService = require('../../business/services/tip.service');

const validId = id => {
  const value = typeof id?.toHexString === 'function' ? id.toHexString() : id;
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
};

const handleTip = (errorMessage, handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    if (error instanceof tipService.TipError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(errorMessage, error);
    return res.status(500).json({ message: errorMessage });
  }
};

const createTip = handleTip('Server error while initiating tip.', async (req, res) => {
  const { returnRecordId, amount, thankYouMessage } = req.body || {};
  if (!returnRecordId) return res.status(400).json({ message: 'Return record ID is required.' });
  if (!validId(returnRecordId)) return res.status(400).json({ message: 'Invalid return record ID.' });

  const numericAmount = typeof amount === 'number' || typeof amount === 'string' ? Number(amount) : NaN;
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than zero.' });
  }
  if (thankYouMessage != null && typeof thankYouMessage !== 'string') {
    return res.status(400).json({ message: 'Thank-you message must be text.' });
  }

  const hostUrl = req.headers?.origin || process.env.CLIENT_URL || 'http://localhost:5173';
  const result = await tipService.createTip({
    returnRecordId, userId: req.userId, amount: numericAmount, thankYouMessage: thankYouMessage || '', hostUrl,
  });
  return res.status(200).json({ message: 'Payment session created successfully.', ...result });
});

const getTipById = handleTip('Server error retrieving tip.', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid tip ID.' });
  return res.status(200).json(await tipService.getTipById(req.params.id, req.userId));
});

const getUserTips = handleTip('Server error retrieving user tip history.', async (req, res) =>
  res.status(200).json(await tipService.getUserTips(req.params.id, req.userId))
);

const paymentMessages = {
  already_paid: 'Payment already verified.',
  paid: 'Payment verified and notifications sent.',
  failed: 'Payment verification failed.',
  pending: 'Payment is still pending.',
};

const updateTipPaymentStatus = handleTip('Server error during payment verification.', async (req, res) => {
  const { paymentReference } = req.body || {};
  if (typeof paymentReference !== 'string' || !paymentReference.trim()) {
    return res.status(400).json({ message: 'Payment reference is required.' });
  }

  const { outcome, tip } = await tipService.updateTipPaymentStatus(paymentReference);
  const status = outcome === 'failed' ? 400 : 200;
  return res.status(status).json({ message: paymentMessages[outcome], tip });
});

const getReturnRecordById = handleTip('Server error retrieving return record.', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid return record ID.' });
  return res.status(200).json(await tipService.getReturnRecordById(req.params.id, req.userId));
});

const skipTip = handleTip('Server error while skipping tip.', async (req, res) => {
  const { returnRecordId } = req.body || {};
  if (!returnRecordId) return res.status(400).json({ message: 'Return record ID is required.' });
  if (!validId(returnRecordId)) return res.status(400).json({ message: 'Invalid return record ID.' });

  const tip = await tipService.skipTip(returnRecordId, req.userId);
  return res.status(200).json({ message: 'Tip successfully marked as skipped.', tip });
});

module.exports = { createTip, getTipById, getUserTips, updateTipPaymentStatus, getReturnRecordById, skipTip };

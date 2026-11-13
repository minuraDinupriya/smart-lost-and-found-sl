const returnService = require('../../business/services/return.service');

const handoverAction = action => async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const result = await action({ itemId, otherUserId, currentUserId: req.userId });
    return res.status(200).json(result);
  } catch (error) {
    if ([400, 403, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Handover request failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getHandoverState: handoverAction(returnService.getHandoverState),
  confirmFinder: handoverAction(returnService.confirmFinder),
  confirmOwner: handoverAction(returnService.confirmOwner),
  confirmReceipt: handoverAction(returnService.confirmReceipt),
};

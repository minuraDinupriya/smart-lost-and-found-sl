const historyService = require('../../business/services/history.service');

const sendHistory = (getHistory, errorMessage) => async (req, res) => {
  try {
    const history = await getHistory(req.userId);
    return res.status(200).json(history);
  } catch (error) {
    console.error(errorMessage, error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

exports.getOwnerHistory = sendHistory(historyService.getOwnerHistory, 'Error fetching owner history:');
exports.getFinderHistory = sendHistory(historyService.getFinderHistory, 'Error fetching finder history:');

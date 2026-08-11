const ReturnRecord = require('../models/ReturnRecord');
const Tip = require('../models/Tip');

// @desc    Get Claimed Item History (Owner)
// @route   GET /api/history/owner
// @access  Private
exports.getOwnerHistory = async (req, res) => {
  try {
    const returnRecords = await ReturnRecord.find({ ownerId: req.userId })
      .populate('itemId', 'title imageUrl type category')
      .populate('finderId', 'username email')
      .sort({ createdAt: -1 });

    // Append tip information to each record
    const history = await Promise.all(
      returnRecords.map(async (record) => {
        const tip = await Tip.findOne({ returnRecordId: record._id });
        return {
          ...record._doc,
          tip: tip || null,
        };
      })
    );

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching owner history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get Found & Returned History (Finder)
// @route   GET /api/history/finder
// @access  Private
exports.getFinderHistory = async (req, res) => {
  try {
    const returnRecords = await ReturnRecord.find({ finderId: req.userId })
      .populate('itemId', 'title imageUrl type category')
      .populate('ownerId', 'username email')
      .sort({ createdAt: -1 });

    // Append tip information to each record
    const history = await Promise.all(
      returnRecords.map(async (record) => {
        const tip = await Tip.findOne({ returnRecordId: record._id });
        return {
          ...record._doc,
          tip: tip || null,
        };
      })
    );

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching finder history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

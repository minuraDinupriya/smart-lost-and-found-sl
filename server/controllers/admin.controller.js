const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Get system-wide statistics for Admin Dashboard
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    const [
      totalItems,
      activeItems,
      claimedItems,
      lostItems,
      foundItems,
      smartTags,
      totalUsers,
      policeUsers,
      adminUsers,
      regularUsers,
    ] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ archiveStatus: 'active' }),
      Item.countDocuments({ status: 'Claimed' }),
      Item.countDocuments({ type: 'LOST' }),
      Item.countDocuments({ type: 'FOUND' }),
      Item.countDocuments({ type: 'SMART_TAG' }),
      User.countDocuments(),
      User.countDocuments({ role: 'police' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
    ]);

    res.status(200).json({
      stats: {
        totalItems,
        activeItems,
        claimedItems,
        lostItems,
        foundItems,
        smartTags,
        totalUsers,
        policeUsers,
        adminUsers,
        regularUsers,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve admin stats.' });
  }
};

// @desc    Get all items with pagination, search, and filters for admin moderation
// @route   GET /api/admin/items
// @access  Private (Admin only)
const getAllItemsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { search, type, status, archiveStatus } = req.query;

    const query = {};

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (archiveStatus && archiveStatus !== 'ALL') {
      query.archiveStatus = archiveStatus;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const totalItems = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('createdBy', 'username email role profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      items,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      totalItems,
    });
  } catch (error) {
    console.error('Get all items admin error:', error);
    res.status(500).json({ message: 'Failed to fetch items.' });
  }
};

// @desc    Update item status or archive status (Admin control)
// @route   PATCH /api/admin/items/:id/status
// @access  Private (Admin only)
const updateItemStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, archiveStatus } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (status) {
      item.status = status;
    }
    if (archiveStatus) {
      item.archiveStatus = archiveStatus;
    }

    await item.save();

    const updatedItem = await Item.findById(id).populate('createdBy', 'username email role profilePicture');

    res.status(200).json({
      message: 'Post updated successfully.',
      item: updatedItem,
    });
  } catch (error) {
    console.error('Update item status admin error:', error);
    res.status(500).json({ message: 'Failed to update item.' });
  }
};

// @desc    Delete any item post from system (Admin removal)
// @route   DELETE /api/admin/items/:id
// @access  Private (Admin only)
const deleteItemAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    await Item.findByIdAndDelete(id);

    res.status(200).json({ message: 'Post successfully deleted by admin.' });
  } catch (error) {
    console.error('Delete item admin error:', error);
    res.status(500).json({ message: 'Failed to delete post.' });
  }
};

// @desc    Get all registered users for admin management
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { search, role } = req.query;

    const query = {};

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { policeStationName: { $regex: search, $options: 'i' } },
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      totalUsers,
    });
  } catch (error) {
    console.error('Get all users admin error:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

// @desc    Update user role & details (Admin operation)
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin only)
const updateUserRoleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, policeStationName } = req.body;

    if (!['user', 'police', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.role = role;
    if (role === 'police' && policeStationName !== undefined) {
      user.policeStationName = policeStationName;
    }

    await user.save();

    const updatedUser = await User.findById(id).select('-password');

    res.status(200).json({
      message: 'User role updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user role admin error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
};

// @desc    Delete a user account (Admin action)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userId === id) {
      return res.status(400).json({ message: 'Admin cannot delete their own account via admin dashboard.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: 'User account successfully deleted.' });
  } catch (error) {
    console.error('Delete user admin error:', error);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
};

module.exports = {
  getAdminStats,
  getAllItemsAdmin,
  updateItemStatusAdmin,
  deleteItemAdmin,
  getAllUsersAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
};

const User = require('../models/User');

const findUserById = userId => User.findById(userId);
const findUserRole = userId => findUserById(userId).select('role policeStationName');
const findPublicUserById = userId => findUserById(userId).select('-password');
const userExists = userId => User.exists({ _id: userId });
const findUserByUsername = username => User.findOne({ username });
const findGoogleUser = (googleId, email) => User.findOne({ $or: [{ googleId }, { email }] });
const createUser = data => User.create(data);
const saveUser = user => user.save();
const deleteUserById = userId => User.findByIdAndDelete(userId);
const findLeaderboard = () => User.find()
  .select('username karmaPoints')
  .sort({ karmaPoints: -1 })
  .limit(10);

module.exports = {
  findUserById,
  findUserRole,
  findPublicUserById,
  userExists,
  findUserByUsername,
  findGoogleUser,
  createUser,
  saveUser,
  deleteUserById,
  findLeaderboard,
};

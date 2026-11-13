const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const users = require('../../data-access/repositories/user.repository');
const { findPendingPaidTips, saveTip } = require('../../data-access/repositories/tip.repository');
const { hasImageStorageConfig, uploadImage } = require('../../data-access/integrations/image-storage');
const { verifyGoogleIdentity } = require('../../data-access/integrations/google-identity');
const paymentService = require('../../data-access/integrations/payment-gateway');
const { notifyUser } = require('./notification.service');
const { signSession } = require('./session.service');

const loginResponse = user => ({
  token: signSession(user._id),
  username: user.username,
  userId: user._id,
  role: user.role,
  policeStationName: user.policeStationName,
  profilePicture: user.profilePicture,
});

const register = async ({ username, password }) => {
  if (await users.findUserByUsername(username)) return false;

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await users.createUser({ username, password: hashedPassword });
    return true;
  } catch (error) {
    // A concurrent registration can claim the username after the initial lookup.
    if (error.code === 11000) return false;
    throw error;
  }
};

const login = async ({ username, password }) => {
  const user = await users.findUserByUsername(username);
  if (!user?.password || !await bcrypt.compare(password, user.password)) return null;
  return loginResponse(user);
};

const googleLogin = async token => {
  const { sub: googleId, email, name, picture } = await verifyGoogleIdentity(token);
  let user = await users.findGoogleUser(googleId, email);

  if (!user) {
    let username = name.replace(/\s+/g, '').toLowerCase();
    if (await users.findUserByUsername(username)) {
      username = `${username}${Math.floor(Math.random() * 10000)}`;
    }
    user = await users.createUser({ username, googleId, email, profilePicture: picture });
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.profilePicture = picture;
    await users.saveUser(user);
  }

  return loginResponse(user);
};

const getProfile = userId => users.findPublicUserById(userId);
const getLeaderboard = () => users.findLeaderboard();

const removeTemporaryUpload = async file => {
  if (!file) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to clean up temporary profile upload:', error);
  }
};

const saveProfilePicture = async file => {
  if (hasImageStorageConfig()) {
    try {
      const imageUrl = await uploadImage(file.path);
      await removeTemporaryUpload(file);
      return imageUrl;
    } catch (error) {
      console.error('Profile image upload failed, using local storage:', error.message);
    }
  }
  return `/uploads/${file.filename}`;
};

const updateProfile = async (userId, { username, file }) => {
  try {
    if (username != null && typeof username !== 'string') {
      await removeTemporaryUpload(file);
      return { error: 'INVALID_USERNAME' };
    }

    const user = await users.findUserById(userId);
    if (!user) {
      await removeTemporaryUpload(file);
      return { error: 'USER_NOT_FOUND' };
    }
    if (username && username !== user.username) {
      if (await users.findUserByUsername(username)) {
        await removeTemporaryUpload(file);
        return { error: 'USERNAME_TAKEN' };
      }
      user.username = username;
    }

    if (file) user.profilePicture = await saveProfilePicture(file);
    await users.saveUser(user);
    return { user: await getProfile(userId) };
  } catch (error) {
    await removeTemporaryUpload(file);
    if (error.code === 11000) return { error: 'USERNAME_TAKEN' };
    throw error;
  }
};

const updateBankDetails = async (userId, bankDetails) => {
  const user = await users.findUserById(userId);
  if (!user) return null;

  user.bankDetails = bankDetails;
  await users.saveUser(user);

  let processedCount = 0;
  const pendingTips = await findPendingPaidTips(userId);
  for (const tip of pendingTips) {
    const payoutResult = await paymentService.initiatePayout(tip, user);
    if (payoutResult.status !== 'completed') continue;

    tip.payoutStatus = 'completed';
    await saveTip(tip);
    processedCount++;
    await notifyUser({
      userId: tip.finderId,
      message: `🎉 Your pending reward of Rs. ${tip.amount} has been successfully transferred to your newly added bank account!`,
      type: 'TIP_RECEIVED',
    });
  }

  return { user: await getProfile(userId), processedCount };
};

module.exports = {
  register, login, googleLogin, getProfile, getLeaderboard, updateProfile, updateBankDetails,
};

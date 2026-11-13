const authService = require('../../business/services/auth.service');

const hasCredentials = body =>
  typeof body?.username === 'string' && body.username.trim() !== '' &&
  typeof body.password === 'string' && body.password !== '';

const register = async (req, res) => {
  if (!hasCredentials(req.body)) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const { username, password } = req.body;
    if (!await authService.register({ username, password })) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    return res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  if (!hasCredentials(req.body)) return res.status(400).json({ message: 'Invalid credentials.' });

  try {
    const { username, password } = req.body;
    const session = await authService.login({ username, password });
    if (!session) return res.status(400).json({ message: 'Invalid credentials.' });
    return res.status(200).json(session);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

const googleLogin = async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'Google token is required.' });
  }

  try {
    return res.status(200).json(await authService.googleLogin(token));
  } catch (error) {
    console.error('Google Login error:', error);
    return res.status(500).json({ message: 'Server error during Google Login.' });
  }
};

const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: await authService.getProfile(req.userId) });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    return res.status(200).json({ leaderboard: await authService.getLeaderboard() });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile(req.userId, { username: req.body?.username, file: req.file });
    if (result.error === 'INVALID_USERNAME') {
      return res.status(400).json({ message: 'Username must be a string.' });
    }
    if (result.error === 'USERNAME_TAKEN') {
      return res.status(400).json({ message: 'Username is already taken.' });
    }
    if (result.error === 'USER_NOT_FOUND') return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ message: 'Profile updated successfully.', user: result.user });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error during profile update.' });
  }
};

const updateBankDetails = async (req, res) => {
  const { bankName, branchName, accountName, accountNumber } = req.body || {};
  if ([bankName, branchName, accountName, accountNumber].some(value => value != null && typeof value !== 'string')) {
    return res.status(400).json({ message: 'Bank details must be strings.' });
  }

  try {
    const result = await authService.updateBankDetails(req.userId, {
      bankName: bankName || '',
      branchName: branchName || '',
      accountName: accountName || '',
      accountNumber: accountNumber || '',
    });
    if (!result) return res.status(404).json({ message: 'User not found.' });

    const { user, processedCount } = result;
    const payoutMessage = processedCount > 0 ? `Initiated ${processedCount} pending payout(s)!` : '';
    return res.status(200).json({ message: `Bank details updated successfully. ${payoutMessage}`, user });
  } catch {
    console.error('Update bank details failed.');
    return res.status(500).json({ message: 'Server error during bank details update.' });
  }
};

module.exports = { register, login, googleLogin, getMe, getLeaderboard, updateProfile, updateBankDetails };

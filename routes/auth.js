const express = require('express');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  logout,
  refreshToken
} = require('../controllers/authController');

const { protect, verifyRefreshToken } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdatePassword,
  validateRefreshToken
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgotpassword', validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', validateResetPassword, resetPassword);
router.post('/refresh', validateRefreshToken, verifyRefreshToken, refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, validateUpdatePassword, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;

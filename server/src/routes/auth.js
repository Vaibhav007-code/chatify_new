const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.post('/register', [
  body('username').notEmpty().trim(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], userController.register);

router.post('/login', [
  body('username').notEmpty().trim(),
  body('password').exists(),
], userController.login);

router.get('/user', auth, userController.getUser);

router.get('/users', auth, userController.getUsers);
router.get('/users/search', auth, userController.searchUsers);

router.post('/logout', auth, userController.logout);

module.exports = router; 
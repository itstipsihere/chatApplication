const express = require('express');
const { registerUser, authUser, allUsers } = require('../controllers/userControllers');
const {protect} = require("../middleware/authMiddleware");
const router = express.Router();

router.post('/', registerUser);
router.post('/login', authUser);
router.get('/', protect, allUsers); // ✅ Add protect here
router.get('/search-user', protect, allUsers); // ✅ Already correct





module.exports = router;

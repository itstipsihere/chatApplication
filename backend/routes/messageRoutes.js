const express = require("express")
const router = express.Router();
const {protect} = require ("../middleware/authMiddleware");
const {sendMessage,allMessage } = require("../controllers/messageControllers")


router.route('/').post(protect,sendMessage)
router.route('/:chatId').get(protect,allMessage)

module.exports = router;
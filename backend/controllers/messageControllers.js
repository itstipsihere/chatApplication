const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel"); // Make sure Chat model is imported

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email pic",
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message,
    });

    message = message.toObject(); // <-- Convert to plain JS object before sending

    console.log("📤 Sending new message:", message); // Debug log

    res.json(message);
  } catch (error) {
    console.error("Message sending failed:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

const allMessage = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    console.log("📤 Sending all messages:", messages); // Debug log

    // Convert all messages to plain objects
    res.json(messages.map((msg) => msg.toObject()));
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { sendMessage, allMessage };

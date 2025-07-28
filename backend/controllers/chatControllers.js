const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel"); // Assuming you use this in populate


const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("userId param not sent with request");
    return res.status(400).json({ message: "UserId param not sent with request" });
  }

  try {
    // Check if a one-to-one chat already exists
    let isChat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    // Populate sender info in latest message
    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    if (isChat) {
      return res.status(200).send(isChat);
    }

    // If no chat exists, create a new one
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id })
      .populate("users", "-password");

    return res.status(200).send(fullChat);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});




const fetchChats = asyncHandler(async (req, res) => {
  try {
    // Fetch all chats where the current user is in the 'users' array
    const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password") // Exclude the password field from users
      .populate("latestMessage") // Include the latest message in the chat
      .sort({ updatedAt: -1 }) // Sort by the latest updated time (most recent chat first)
      .then(async(results)=>{
        results = await User.populate(results,{
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);

      })
   
  } 
  
  catch (error) {
    res.status(500);
    throw new Error("Failed to fetch chats");
  }
});


const createGroupChat = asyncHandler(async (req, res) => {
  const { users, name } = req.body;

  if (!users || !name) {
    return res.status(400).json({ message: "Please provide all fields (users and name)." });
  }

  let parsedUsers;
  try {
    parsedUsers = typeof users === 'string' ? JSON.parse(users) : users;
  } catch (error) {
    return res.status(400).json({ message: "Invalid users format." });
  }

  if (parsedUsers.length < 1) {
    return res.status(400).json({ message: "A group chat needs at least 3 members including you." });
  }

  // Add current user as ObjectId, not object
  parsedUsers.push(req.user._id);

  const groupChat = await Chat.create({
    chatName: name,
    users: parsedUsers,
    isGroupChat: true,
    groupAdmin: req.user._id,
  });

  const fullGroupChat = await Chat.findById(groupChat._id)
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json(fullGroupChat);
});



// Rename a group chat
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName) {
    res.status(400);
    throw new Error("chatId and chatName are required.");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true }
  )

  .populate("users","-password")
  .populate("groupAdmin","-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat not found.");
  }

  res.status(200).json(updatedChat);
});



const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // ✅ 1. Validate required fields
  if (!chatId || !userId) {
    res.status(400);
    throw new Error("chatId and userId are required.");
  }

  // ✅ 2. Find chat and check existence
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found.");
  }

  // ✅ 3. Validate chat.users is an array
  if (!Array.isArray(chat.users)) {
    res.status(500);
    throw new Error("Chat users list is corrupted.");
  }

  // ✅ 4. Normalize ObjectId comparison using .some()
  const userAlreadyInGroup = chat.users.some(
    (user) => user.toString() === userId.toString()
  );

  if (userAlreadyInGroup) {
    res.status(400);
    throw new Error("User is already in the group.");
  }

  // ✅ 5. Safely check if current user is group admin
  if (!chat.groupAdmin) {
    res.status(400);
    throw new Error("Group admin is not defined.");
  }

  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error("User not authenticated.");
  }

  const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();
  if (!isAdmin) {
    res.status(403);
    throw new Error("Only group admins can add users.");
  }

  // ✅ 6. Add the new user to the group
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  // ✅ 7. Handle update failure
  if (!updatedChat) {
    res.status(500);
    throw new Error("Failed to update the group.");
  }

  res.status(200).json(updatedChat);
});

const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    res.status(400);
    throw new Error("chatId and userId are required.");
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found.");
  }

  // Only group admin can remove others, or users can leave themselves
  const isSelfRemove = req.user._id.toString() === userId.toString();
  const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();

  if (!isAdmin && !isSelfRemove) {
    res.status(403);
    throw new Error("Only group admins can remove users.");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  ).populate("users", "-password").populate("groupAdmin", "-password");

  res.status(200).json(updatedChat);
});


module.exports = { accessChat ,fetchChats ,createGroupChat ,renameGroup ,addToGroup,removeFromGroup};

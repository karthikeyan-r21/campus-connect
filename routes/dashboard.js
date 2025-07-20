const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const authMiddleware = require("../middlewares/authMiddleware");
const User = require("../models/User");

router.get("/", authMiddleware, async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  console.log("Session user:", req.session.user);
  try {
    const posts = await Post.find()
      .populate("createdBy", "name email profilePicture")
      .populate("likes", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Enhanced logging for debugging
    console.log("User ID:", req.session.user._id);
    console.log("Number of posts found:", posts.length);

    // Get all users except the current user
    const allUsers = await User.find({ _id: { $ne: req.session.user._id } });
    console.log("All users found:", allUsers.length);
    // Get the current user's following list for follow button logic
    const currentUser = await User.findById(req.session.user._id);

    res.render("dashboard", {
      title: "Dashboard - CampusConnect",
      user: req.session.user,
      posts, // Pass original posts with HTML content
      allUsers,
      following: currentUser.following || [],
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).render("error", {
      message: "Error loading dashboard",
      error: process.env.NODE_ENV === "development" ? err : {},
    });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Community = require("../models/Community");
const authMiddleware = require("../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../public/uploads/profile-pictures");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Get user profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followers", "name profilePicture")
      .populate("following", "name profilePicture");

    // Get user's posts
    const posts = await Post.find({ createdBy: req.user._id })
      .populate("community", "name")
      .populate("likes", "name")
      .sort({ createdAt: -1 });

    // Get communities user has joined
    const communities = await Community.find({ members: req.user._id });

    // Calculate total likes received
    const allPosts = await Post.find({ createdBy: req.user._id });
    const totalLikes = allPosts.reduce((total, post) => total + (post.likes ? post.likes.length : 0), 0);

    res.render("profile", {
      user,
      posts,
      communities,
      totalLikes,
      isOwnProfile: true,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).render("error", {
      message: "Error loading profile",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// Edit profile page
router.get("/edit", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render("editProfile", { user });
  } catch (error) {
    console.error("Edit profile error:", error);
    res.status(500).render("error", {
      message: "Error loading edit profile page",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// Update profile
router.post("/edit", authMiddleware, upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, bio, studentId, department } = req.body;
    const updateData = { name, bio, studentId, department };

    // Handle profile picture upload
    if (req.file) {
      updateData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
    }

    await User.findByIdAndUpdate(req.user._id, updateData);
    res.redirect("/profile");
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).render("error", {
      message: "Error updating profile",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// Get other user's profile
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId)
      .populate("followers", "name profilePicture")
      .populate("following", "name profilePicture");

    if (!profileUser) {
      return res.status(404).render("error", {
        message: "User not found",
        error: {},
      });
    }

    // Get user's posts
    const posts = await Post.find({ createdBy: req.params.userId })
      .populate("community", "name")
      .populate("likes", "name")
      .sort({ createdAt: -1 });

    // Get communities user has joined
    const communities = await Community.find({ members: req.params.userId });

    // Calculate total likes received
    const allPosts = await Post.find({ createdBy: req.params.userId });
    const totalLikes = allPosts.reduce((total, post) => total + (post.likes ? post.likes.length : 0), 0);

    // Check if current user is following this profile
    const isFollowing = profileUser.followers.includes(req.user._id);

    res.render("profile", {
      user: profileUser,
      posts,
      communities,
      totalLikes,
      isOwnProfile: req.user._id.toString() === req.params.userId,
      isFollowing,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).render("error", {
      message: "Error loading profile",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// Change password
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate current password
    const user = await User.findById(req.user._id);
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Validate new password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Error changing password" });
  }
});

// Follow user
router.post("/follow/:userId", authMiddleware, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const isFollowing = currentUser.following.includes(req.params.userId);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: req.params.userId }
      });
      await User.findByIdAndUpdate(req.params.userId, {
        $pull: { followers: req.user._id }
      });
      res.json({ success: true, action: "unfollowed" });
    } else {
      // Follow
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: req.params.userId }
      });
      await User.findByIdAndUpdate(req.params.userId, {
        $push: { followers: req.user._id }
      });
      res.json({ success: true, action: "followed" });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Error following user" });
  }
});

// Like/Unlike post
router.post("/like/:postId", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Initialize likes array if it doesn't exist
    if (!post.likes) {
      post.likes = [];
    }

    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      await Post.findByIdAndUpdate(req.params.postId, {
        $pull: { likes: req.user._id }
      });
      res.json({ success: true, action: "unliked" });
    } else {
      // Like
      await Post.findByIdAndUpdate(req.params.postId, {
        $push: { likes: req.user._id }
      });
      res.json({ success: true, action: "liked" });
    }
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ error: "Error liking post" });
  }
});

module.exports = router; 
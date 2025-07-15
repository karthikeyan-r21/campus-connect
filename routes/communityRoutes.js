const express = require("express");
const router = express.Router();
const Community = require("../models/Community");
const Post = require("../models/Post");
const authMiddleware = require("../middlewares/authMiddleware");

// Get all communities
router.get("/", authMiddleware, async (req, res) => {
  try {
    const communities = await Community.find()
      .populate("creator", "name") // Fetch creator's name only
      .populate("members", "name"); // Fetch members' names
    res.render("communities", { communities });
  } catch (error) {
    res.status(500).json({ error: "Error fetching communities" });
  }
});

// Create a new community
router.post("/", authMiddleware, async (req, res) => {
  try {
    const community = new Community({
      name: req.body.name,
      description: req.body.description,
      creator: req.user._id,
      members: [req.user._id], // Add the creator as the first member
    });

    await community.save();
    res.status(200).json({
      message: "Community created successfully",
      community,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error creating community",
      details: error.message,
    });
  }
});

// Join a community
router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Add user to community if not already a member
    if (!community.members.includes(req.user._id)) {
      community.members.push(req.user._id);
      await community.save();
      res.status(200).json(community); // Send updated community object
    } else {
      res.status(400).json({ error: "Already a member" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a community
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Remove user from community members
    community.members = community.members.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await community.save();
    res.status(200).json(community); // Send updated community object
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a post within a community
router.post("/:communityId/posts", authMiddleware, async (req, res) => {
  try {
    // Create new post
    const post = new Post({
      title: req.body.title,
      content: req.body.content,
      community: req.params.communityId,
      createdBy: req.user._id,
    });

    // Save the post
    await post.save();

    // Redirect to the community page after successful post creation
    return res.redirect(`/communities/${req.params.communityId}`);
  } catch (error) {
    // Optionally, render the community page with an error message
    return res.status(400).render("communityDetail", {
      community: await Community.findById(req.params.communityId),
      posts: await Post.find({ community: req.params.communityId }).populate("createdBy", "name profilePicture").populate("likes", "name").sort({ createdAt: -1 }),
      user: req.user,
      message: "Post creation failed: " + error.message,
    });
  }
});

// Fetch posts for a specific community
router.get("/:id/posts", authMiddleware, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate("creator", "name") // Populate creator's name
      .populate("members", "name"); // Populate members' names

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Fetch posts for the community
    const posts = await Post.find({ community: req.params.id })
      .populate("author", "name") // Populate author details
      .sort("-createdAt"); // Sort posts by creation date (latest first)

    res.render("communityPosts", { posts, community }); // Pass both posts and community to the view
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching posts", details: error.message });
  }
});

// Get details of a single community, including posts
router.get("/:id", async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    const posts = await Post.find({ community: req.params.id })
      .populate("createdBy", "name profilePicture")
      .populate("likes", "name")
      .sort({ createdAt: -1 });

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    res.render("communityDetail", {
      community,
      posts,
      user: req.user,
    });
  } catch (err) {
    res.status(500).json({
      error: "Error fetching community details",
      details: err.message,
    });
  }
});

module.exports = router;

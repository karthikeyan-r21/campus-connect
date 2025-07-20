const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Post = require("../models/Post");
const authMiddleware = require("../middlewares/authMiddleware");
const fs = require("fs");

// Ensure consistent upload directories
const uploadsDir = path.join(__dirname, "../public/uploads");
const picturesDir = path.join(uploadsDir, "pictures");
const documentsDir = path.join(uploadsDir, "documents");

// Create directories if they don't exist
[uploadsDir, picturesDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const dest = file.fieldname === "image" ? picturesDir : documentsDir;
      cb(null, dest);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const filetypes = {
      image: /jpeg|jpg|png|gif|webp/,
      documents: /pdf|doc|docx|txt/,
    };
    const fieldType = file.fieldname;
    const extname = filetypes[fieldType]?.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes[fieldType]?.test(file.mimetype);

    if (extname && mimetype) return cb(null, true);
    cb(new Error(`Error: Invalid ${fieldType} file type!`));
  },
});

// Route: Render Create Post Page (with optional community context)
router.get("/create-post", authMiddleware, (req, res) => {
  const { communityId } = req.query; // Optional query parameter for communityId
  res.render("create-post", { message: null, communityId });
});

// Route: Handle Post Creation (with community context)
router.post(
  "/create-post",
  authMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "documents", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { title, content, communityId } = req.body;
      if (!title || !content) {
        throw new Error("Title and content are required.");
      }

      // If a communityId is present, do NOT create the post here. Redirect to the community's post creation route.
      if (communityId) {
        return res.redirect(`/communities/${communityId}`);
      }

      const userId = req.user._id; // Ensure req.user is set correctly by authMiddleware

      const regex = /<img[^>]+src="([^">]+)"/g;
      const matches = [...content.matchAll(regex)];
      const imageUrls = matches.map((match) => {
        // If the src is just a filename (no slash), prepend the correct path
        if (match[1] && !match[1].startsWith('/') && !match[1].startsWith('http')) {
          return `/uploads/pictures/${match[1]}`;
        }
        // If the src is a filename with no leading slash, also prepend
        if (match[1] && match[1].match(/^[^\/]+\.(png|jpg|jpeg|gif|webp)$/i)) {
          return `/uploads/pictures/${match[1]}`;
        }
        return match[1];
      });

      // Prepare post data
      const postData = {
        title,
        content,
        user: userId, // Set user as the logged-in user
        createdBy: userId, // Set createdBy as the logged-in user
        documents: [],
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
        community: null, // Only allow non-community posts here
      };

      // Handle file uploads for documents
      if (req.files.documents && req.files.documents.length > 0) {
        postData.documents = req.files.documents.map((file) => ({
          filename: file.originalname,
          path: `/uploads/documents/${file.filename}`,
          uploadDate: new Date(),
        }));
      }

      // Save the new post
      const newPost = new Post(postData);
      await newPost.save();

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Post creation error:", error);
      res.status(500).send("Error creating post: " + error.message);
    }
  }
);

// Add this route to handle post deletion
router.delete("/posts/delete-post/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting post" });
  }
});

// Routes: Upload Image and Document
router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  const imageUrl = `/uploads/pictures/${req.file.filename}`;
  res.status(201).json({
    success: true,
    imageUrl,
    message: "Image uploaded successfully",
  });
});

router.post("/upload-document", upload.single("documents"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No document uploaded" });

  const fileUrl = `/uploads/documents/${req.file.filename}`;
  res.status(201).json({
    success: true,
    fileUrl,
    filename: req.file.originalname,
    message: "Document uploaded successfully",
  });
});

// Add a comment to a post
router.post('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    const comment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date()
    };
    post.comments.push(comment);
    await post.save();
    await post.populate({ path: 'comments.user', select: 'name profilePicture' });
    const newComment = post.comments[post.comments.length - 1];
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding comment.' });
  }
});

// Get comments for a post
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: 'comments.user',
        select: 'name profilePicture'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'name profilePicture'
      });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    res.status(200).json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching comments.' });
  }
});

// Edit a comment
router.patch('/posts/:postId/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    comment.text = text.trim();
    await post.save();
    res.json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error editing comment.' });
  }
});

// Like/unlike a comment
router.patch('/posts/:postId/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const userId = req.user._id.toString();
    const index = comment.likes.findIndex(id => id.toString() === userId);
    if (index === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(index, 1);
    }
    await post.save();
    res.json({ success: true, likes: comment.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error liking comment.' });
  }
});

// Reply to a comment
router.post('/posts/:postId/comments/:commentId/reply', authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Reply cannot be empty.' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const reply = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
      likes: []
    };
    comment.replies.push(reply);
    await post.save();
    res.status(201).json({ success: true, reply: comment.replies[comment.replies.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error replying to comment.' });
  }
});

// Route: Fetch Posts (including those within communities)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name email") // Populate `user`, not `createdBy`
      .sort("-createdAt");
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send("Error fetching posts: " + error.message);
  }
});

// Route: Fetch Posts within a Specific Community
router.get("/community/:communityId", authMiddleware, async (req, res) => {
  const { communityId } = req.params;
  try {
    const posts = await Post.find({ community: communityId })
      .populate("user", "name email") // Only populate necessary fields
      .sort("-createdAt");
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching community posts:", error);
    res
      .status(500)
      .send("Error fetching posts for this community: " + error.message);
  }
});

module.exports = router;

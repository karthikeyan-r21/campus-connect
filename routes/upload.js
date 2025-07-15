const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Configure Multer to save files in 'public/uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads/")); // Save files in 'public/uploads/' directory
  },
  filename: (req, file, cb) => {
    // Preserve original file extension
    cb(null, file.originalname);
  },
});

const upload = multer({ storage }); // Using custom storage configuration

// Endpoint to handle document uploads
router.post("/", upload.single("file"), (req, res) => {
  if (req.file) {
    const fileUrl = `/uploads/${req.file.filename}`; // URL to access the uploaded file
    return res.json({ fileUrl });
  } else {
    return res.status(400).json({ error: "No file uploaded" });
  }
});

module.exports = router;

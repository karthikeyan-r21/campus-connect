const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const postRoutes = require("./routes/postRoutes");
const uploadRoute = require("./routes/upload");
const communityRoutes = require("./routes/communityRoutes");
const profileRoutes = require("./routes/profile");
require("dotenv").config();

const app = express();

// Static file serving
app.use(express.static("public"));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "public/uploads"), {
    maxAge: "1d",
    etag: false,
  })
);

// Middleware for request parsing
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Middleware to attach session user globally
app.use((req, res, next) => {
  if (req.session.user) {
    req.user = req.session.user; // Attach session user to `req.user`
  }
  res.locals.user = req.session.user || null; // Attach user to locals for EJS views
  next();
});

// MongoDB Connection
if (!process.env.MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not set. Please set it in your Render dashboard or .env file.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use(authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use(postRoutes);
app.use("/posts", postRoutes);
app.use("/upload", uploadRoute);
app.use("/communities", communityRoutes);
app.use("/profile", profileRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: res.locals.error,
  });
});

// Start the Server
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));

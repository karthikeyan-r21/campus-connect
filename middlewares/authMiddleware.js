const User = require("../models/User");

module.exports = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  try {
    // Fetch the full user object from the database
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res
        .status(401)
        .json({ error: "User not found. Please log in again." });
    }

    req.user = user; // Attach the full user object to `req.user`
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).send("Internal server error.");
  }
};

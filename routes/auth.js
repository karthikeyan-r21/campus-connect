const express = require('express');
const router = express.Router();
const User = require('../models/User'); // User model
const bcrypt = require('bcrypt'); // For password hashing

// Signup (GET)
router.get('/signup', (req, res) => {
  res.render('auth/signup'); // Render the signup EJS view
});

// Login Page (GET)
router.get('/login', (req, res) => {
  res.render('auth/login'); // Render the login EJS view
});

// Signup (POST)
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('User already exists with this email');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Redirect to login page after successful signup
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST Route for login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("Login error: User not found for email", email);
      return res.render('auth/login', { message: 'User not found! Please sign up.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("Login error: Incorrect password for email", email);
      return res.render('auth/login', { message: 'Incorrect password!' });
    }

    // Corrected session setup
    req.session.user = {
      _id: user._id,
      name: user.name,  // Changed from username to name
      email: user.email,
    };

    // Add this line to log session info
    console.log("Session after login:", req.session);

    res.redirect('/dashboard');
  } catch (err) {
    console.error("Login route error:", err);
    res.status(500).send('Server error');
  }
});

// Logout (GET)
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Unable to log out');
    }
    res.redirect('/login');
  });
});


module.exports = router;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: '',
  },
  studentId: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: '',
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reputation: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
//adding models for user

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  phoneNumber: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePicture: {
    data: Buffer,
    contentType: String,
  },
  githubId: String,
  profilePhoto: String,
});

module.exports = mongoose.model("User", UserSchema);

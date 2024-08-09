const mongoose = require("mongoose");
const { Schema } = mongoose;

const ShareLinkSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "24h", // Link expires after 24 hours
  },
});

module.exports = mongoose.model("ShareLink", ShareLinkSchema);

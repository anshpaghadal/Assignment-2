//adding models for job application
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const JobApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  applicationDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["applied", "interviewed", "offered", "rejected"],
  },
  followUpDate: {
    type: Date,
  },
  location: {
    type: String,
    required: true,
  },
  industry: {
    type: String,
  },
  uuid: {
    type: String,
    default: uuidv4,
  },
});

const JobApplication = mongoose.model("JobApplication", JobApplicationSchema);
module.exports = JobApplication;

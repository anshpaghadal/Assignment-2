const express = require("express");
const router = express.Router();
const ShareLink = require("../models/ShareLink");
const JobApplication = require("../models/JobApplication");

// Route to display the shared profile
router.get("/:token", async (req, res) => {
  try {
    const shareLink = await ShareLink.findOne({
      token: req.params.token,
    }).populate("user");
    if (!shareLink) {
      req.flash("error_msg", "Invalid or expired link");
      return res.redirect("/");
    }

    const jobApplications = await JobApplication.find({
      user: shareLink.user._id,
    }); // Fetch job applications for the user

    res.render("sharedProfile", {
      title: "Shared Profile",
      user: shareLink.user,
      jobApplications: jobApplications,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/");
  }
});

module.exports = router;

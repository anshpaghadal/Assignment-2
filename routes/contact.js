const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
const Contact = require("../models/Contact");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Contact form page
router.get("/", ensureAuthenticated, (req, res) => {
  res.render("contact", { title: "Contact Us" });
});

// Handle contact form submission
router.post(
  "/",
  ensureAuthenticated,
  upload.single("screenshot"),
  async (req, res) => {
    const { name, helpWith, accountEmail, contactEmail, description } =
      req.body;
    const userEmail = req.user.email;

    let errors = [];

    if (accountEmail !== userEmail) {
      errors.push({
        msg: "The email associated with this account does not match the logged-in email.",
      });
    }

    if (errors.length > 0) {
      return res.render("contact", {
        title: "Contact Us",
        errors,
        name,
        helpWith,
        accountEmail,
        contactEmail,
        description,
      });
    }

    try {
      const newContact = new Contact({
        name,
        helpWith,
        accountEmail,
        contactEmail,
        description,
        screenshot: req.file
          ? {
              data: req.file.buffer,
              contentType: req.file.mimetype,
            }
          : undefined,
      });
      await newContact.save();
      req.flash(
        "success_msg",
        `We have received your details, we will contact you in 2 business days to your email (${contactEmail}). Thanks for contacting us and your patience.`
      );
      res.redirect("/contact");
    } catch (err) {
      console.error(err);
      res.render("contact", {
        title: "Contact Us",
        errors: [{ msg: "Something went wrong. Please try again later." }],
        name,
        helpWith,
        accountEmail,
        contactEmail,
        description,
      });
    }
  }
);

module.exports = router;

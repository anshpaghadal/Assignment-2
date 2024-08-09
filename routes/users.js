const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const crypto = require("crypto");
const User = require("../models/User");
const transporter = require("../config/nodemailer");
const { ensureAuthenticated } = require("../config/auth");
const upload = require("../config/multer");
const ShareLink = require("../models/ShareLink");

// Login Page
router.get("/login", (req, res) => res.render("login", { title: "Login" }));

// Register Page
router.get("/register", (req, res) =>
  res.render("register", { title: "Register" })
);

// Register Handle
router.post("/register", async (req, res) => {
  const { username, email, password, password2 } = req.body;
  let errors = [];

  if (!username || !email || !password || !password2) {
    errors.push({ msg: "Please enter all fields" });
  }

  if (password !== password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (password.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }

  if (errors.length > 0) {
    return res.render("register", {
      errors,
      username,
      email,
      password,
      password2,
    });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      errors.push({ msg: "Username already exists" });
      return res.render("register", {
        errors,
        username,
        email,
        password,
        password2,
      });
    }

    user = await User.findOne({ email });
    if (user) {
      errors.push({ msg: "Email already exists" });
      return res.render("register", {
        errors,
        username,
        email,
        password,
        password2,
      });
    }

    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    req.flash("success_msg", "You are now registered and can log in");
    res.redirect("/users/login");
  } catch (err) {
    console.error(err);
    res.render("register", {
      errors: [{ msg: "Something went wrong" }],
      username,
      email,
      password,
      password2,
    });
  }
});

// Login Handle
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout Handle
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You are logged out");
    res.redirect("/users/login");
  });
});

// Forgot Password Page
router.get("/forgot", (req, res) =>
  res.render("forgot", { title: "Forgot Password" })
);

// Forgot Password Handle
router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("forgot", {
        error: "No account with that email address exists.",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            http://${req.headers.host}/users/reset/${token}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Email sending error:", err);
        return res.render("forgot", {
          error:
            "An error occurred while sending the email. Please try again later.",
        });
      }
      res.render("forgot", {
        message: `An e-mail has been sent to ${user.email} with further instructions.`,
      });
    });
  } catch (err) {
    console.error(err);
    res.render("forgot", { error: "An error occurred. Please try again." });
  }
});

router.get("/reset/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.render("forgot", {
        error: "Password reset token is invalid or has expired.",
      });
    }
    res.render("reset", { token: req.params.token });
  } catch (err) {
    console.error(err);
    res.render("forgot", { error: "An error occurred. Please try again." });
  }
});

router.post("/reset/:token", async (req, res) => {
  const { password, password2 } = req.body;
  if (password !== password2) {
    return res.render("reset", {
      token: req.params.token,
      error: "Passwords do not match.",
    });
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.render("forgot", {
        error: "Password reset token is invalid or has expired.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success_msg", "Your password has been updated.");
    res.redirect("/users/login");
  } catch (err) {
    console.error(err);
    res.render("reset", {
      token: req.params.token,
      error: "An error occurred. Please try again.",
    });
  }
});

// Profile Page
router.get("/profile", ensureAuthenticated, (req, res) => {
  const user = req.user;
  const profilePictureUrl =
    user.profilePicture && user.profilePicture.data
      ? `data:${
          user.profilePicture.contentType
        };base64,${user.profilePicture.data.toString("base64")}`
      : "/images/Default.jpg";

  res.render("profile", {
    title: res.__("profile"),
    user: {
      ...user.toObject(),
      profilePictureUrl: profilePictureUrl,
    },
    defaultProfilePicture: "/images/Default.jpg",
  });
});

// Handle Profile Update
router.post("/profile", ensureAuthenticated, async (req, res) => {
  const { username, email, phoneNumber, address, city, state, zipCode } =
    req.body;
  try {
    let user = await User.findById(req.user.id);
    user.username = username;
    user.email = email;
    user.phoneNumber = phoneNumber;
    user.address = address;
    user.city = city;
    user.state = state;
    user.zipCode = zipCode;
    await user.save();
    req.flash("success_msg", res.__("Profile updated successfully"));
    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", res.__("Something went wrong"));
    res.redirect("/users/profile");
  }
});

// Handle Profile Picture Upload
router.post(
  "/profile/picture",
  ensureAuthenticated,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        req.flash(
          "error_msg",
          res.__("Please upload a valid image file under 150KB")
        );
        return res.redirect("/users/profile");
      }

      let user = await User.findById(req.user.id);
      user.profilePicture = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
      await user.save();
      req.flash("success_msg", res.__("Profile picture updated successfully"));
      res.redirect("/users/profile");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", res.__("Something went wrong"));
      res.redirect("/users/profile");
    }
  }
);

// Handle Profile Picture Removal
router.post(
  "/profile/picture/remove",
  ensureAuthenticated,
  async (req, res) => {
    try {
      let user = await User.findById(req.user.id);
      user.profilePicture = undefined;
      await user.save();
      req.flash("success_msg", res.__("Profile picture removed successfully"));
      res.redirect("/users/profile");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", res.__("Something went wrong"));
      res.redirect("/users/profile");
    }
  }
);

// Share Profile
router.post("/share", ensureAuthenticated, async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString("hex");
    const shareLink = new ShareLink({
      user: req.user.id,
      token: token,
      createdAt: Date.now(),
    });
    await shareLink.save();
    req.flash(
      "success_msg",
      `Profile shared successfully. Share this link: ${req.headers.origin}/shared/${token}`
    );
    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/users/profile");
  }
});

module.exports = router;

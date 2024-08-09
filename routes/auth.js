const express = require("express");
const passport = require("passport");
const router = express.Router();

// GitHub authentication route
router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

// GitHub callback route
router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/users/login" }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

module.exports = router;

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "forblog734@gmail.com",
    pass: "hkva qtpe qjvr ixti",
  },
});

module.exports = transporter;

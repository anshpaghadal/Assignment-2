const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const path = require("path");
const connectDB = require("./config/db");
const flash = require("connect-flash");
const hbs = require("hbs");
const moment = require("moment");
const i18n = require("i18n");
const cookieParser = require("cookie-parser");

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, "public")));

// Connect to database
connectDB();

// Passport configuration
require("./config/passport")(passport);

// i18n configuration
i18n.configure({
  locales: ["en", "es", "fr"],
  directory: path.join(__dirname, "locales"),
  defaultLocale: "en",
  cookie: "locale",
  queryParameter: "lang",
  autoReload: true,
  updateFiles: true,
  syncFiles: true,
});

// Register partials
hbs.registerPartials(path.join(__dirname, "/views/partials"));

// Set up Handlebars
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Register Handlebars helpers for date formatting
hbs.registerHelper("formatDate", function (date) {
  return moment(date).format("MMMM Do YYYY, dddd");
});

hbs.registerHelper("formatDateForInput", function (date) {
  return moment(date).format("YYYY-MM-DD");
});
hbs.registerHelper("incrementedIndex", function (index) {
  return index + 1;
});
hbs.registerHelper("json", function (context) {
  return JSON.stringify(context, null, 2);
});

// Register Handlebars helper for comparison
hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper("eq", function (a, b) {
  return a === b;
});
hbs.registerHelper("__", function () {
  return i18n.__.apply(this, arguments);
});

// Register Handlebars helpers for translation
hbs.registerHelper("translateStatus", function (status, options) {
  const locale = options.data.root.locale;
  const translations = {
    en: {
      applied: "Applied",
      interviewed: "Interviewed",
      offered: "Offered",
      rejected: "Rejected",
    },
    es: {
      applied: "Aplicado",
      interviewed: "Entrevistado",
      offered: "Ofrecido",
      rejected: "Rechazado",
    },
    fr: {
      applied: "Appliqué",
      interviewed: "Interviewé",
      offered: "Offert",
      rejected: "Rejeté",
    },
  };

  return translations[locale][status];
});

hbs.registerHelper("translateAction", function (action, options) {
  const locale = options.data.root.locale;
  const translations = {
    en: {
      edit: "Edit",
      delete: "Delete",
    },
    es: {
      edit: "Editar",
      delete: "Eliminar",
    },
    fr: {
      edit: "Éditer",
      delete: "Supprimer",
    },
  };

  return translations[locale][action];
});
// Register Handlebars helper for base64 conversion
hbs.registerHelper("base64", function (buffer) {
  return buffer ? buffer.toString("base64") : "";
});

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// i18n initialization middleware
app.use(i18n.init);

// Middleware to handle language switching
app.use((req, res, next) => {
  const lang = req.query.lang || req.cookies.locale || "en";
  res.cookie("locale", lang, { maxAge: 900000, httpOnly: true });
  i18n.setLocale(req, lang);
  res.locals.locale = lang;
  next();
});

// Express session
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  res.locals.__ = res.__; // Add i18n translation function to res.locals
  next();
});

// Static folder
app.use(express.static(path.join(__dirname, "public")));

const jobApplicationsRouter = require("./routes/JobApplications");

// Routes
app.use("/", require("./routes/index"));
app.use("/users", require("./routes/users"));
app.use("/jobApplications", require("./routes/JobApplications"));
app.use("/contact", require("./routes/contact"));
app.use("/", require("./routes/auth"));
app.use("/shared", require("./routes/shared"));
// GitHub OAuth Routes
app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/users/login" }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;

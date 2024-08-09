const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
const JobApplication = require("../models/JobApplication");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const moment = require("moment"); // Import moment
const passport = require("passport");

// Add Job Application
router.post("/add", ensureAuthenticated, async (req, res) => {
  try {
    const {
      company,
      jobTitle,
      applicationDate,
      status,
      followUpDate,
      location,
    } = req.body;

    // Get the next serial number
    const lastJobApplication = await JobApplication.findOne({
      user: req.user.id,
    })
      .sort({ serialNo: -1 })
      .exec();
    const serialNo = lastJobApplication ? lastJobApplication.serialNo + 1 : 1;

    const newJobApplication = new JobApplication({
      user: req.user.id,
      serialNo,
      company,
      jobTitle,
      applicationDate,
      status,
      followUpDate,
      location,
    });

    await newJobApplication.save();
    req.flash("success_msg", "Job application added successfully");
    res.redirect("/jobApplications");
  } catch (err) {
    console.error(err);
    res.render("addJobApplication", {
      errors: [{ msg: "Something went wrong" }],
      company: req.body.company,
      jobTitle: req.body.jobTitle,
      applicationDate: req.body.applicationDate,
      status: req.body.status,
      followUpDate: req.body.followUpDate,
      location: req.body.location,
    });
  }
});

// Middleware to ensure user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

// Route to handle filtered job applications
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const filters = req.query;

    // Build filter query based on filters object
    const filterQuery = { user: userId };

    if (filters.location) {
      filterQuery.location = filters.location;
    }
    if (filters.status) {
      filterQuery.status = filters.status;
    }
    if (filters.applicationDate) {
      filterQuery.applicationDate = { $gte: new Date(filters.applicationDate) };
    }
    if (filters.followUpDate) {
      filterQuery.followUpDate = { $gte: new Date(filters.followUpDate) };
    }
    if (filters.uuid) {
      filterQuery.uuid = filters.uuid;
    }

    // Fetch filtered job applications from the database
    const filteredApplications = await JobApplication.find(filterQuery);

    // Count the total applications
    const totalApplications = filteredApplications.length;

    res.render("dashboard", {
      title: "Filtered Job Applications",
      totalApplications,
      filteredApplications,
      filters,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Export Job Applications to CSV
router.get("/export", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplications = await JobApplication.find({ user: req.user.id });

    const csvWriter = createCsvWriter({
      path: "job_applications.csv",
      header: [
        { id: "serialNo", title: "Serial No" },
        { id: "uuid", title: "UUID" },
        { id: "company", title: "Company" },
        { id: "jobTitle", title: "Job Title" },
        { id: "applicationDate", title: "Application Date" },
        { id: "status", title: "Status" },
        { id: "followUpDate", title: "Follow Up Date" },
        { id: "location", title: "Location" },
      ],
    });

    const records = jobApplications.map((job, index) => ({
      serialNo: index + 1,
      uuid: job.uuid,
      company: job.company,
      jobTitle: job.jobTitle,
      applicationDate: job.applicationDate,
      status: job.status,
      followUpDate: job.followUpDate,
      location: job.location,
    }));

    await csvWriter.writeRecords(records);

    res.download(path.join(__dirname, "..", "job_applications.csv"));
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to export job applications.");
    res.redirect("/jobApplications");
  }
});

// Add route for generating summary report
router.get("/summary", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplications = await JobApplication.find({
      user: req.user.id,
    }).sort({ applicationDate: 1 });

    // Create the reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, "../public/reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Create a PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 72, right: 72 },
    });
    const filePath = path.join(reportsDir, `summary_${req.user.id}.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Add a header
    doc.fontSize(20).fillColor("#2C3E50").text("User Information", {
      align: "center",
      underline: true,
    });
    doc.moveDown(2);

    // Add user profile picture if exists
    if (req.user.profilePicture && req.user.profilePicture.data) {
      const imgBuffer = Buffer.from(req.user.profilePicture.data);
      const imgPath = path.join(reportsDir, `profile_${req.user.id}.png`);
      fs.writeFileSync(imgPath, imgBuffer);

      doc.image(imgPath, {
        fit: [100, 100],
        align: "center",
      });
      doc.moveDown();
    }

    // Add user details
    doc.fontSize(12).fillColor("#34495E").text(`Name: ${req.user.username}`, {
      align: "center",
    });
    doc.text(`Email: ${req.user.email}`, { align: "center" });
    doc.text(`Phone: ${req.user.phoneNumber}`, { align: "center" });
    doc.text(`Address: ${req.user.address}`, { align: "center" });
    doc.text(`City: ${req.user.city}`, { align: "center" });
    doc.text(`State: ${req.user.state}`, { align: "center" });
    doc.text(`Zip Code: ${req.user.zipCode}`, { align: "center" });
    doc.moveDown(2);

    // Add job applications summary
    doc.fontSize(20).fillColor("#2C3E50").text("Job Application Summary", {
      align: "center",
      underline: true,
    });
    doc.moveDown();

    jobApplications.forEach((app, index) => {
      doc
        .fontSize(14)
        .fillColor("#2980B9")
        .text(`Serial No.: ${index + 1}`, {
          continued: true,
        });
      doc.fontSize(14).fillColor("#34495E").text(` - ${app.jobTitle}`, {
        underline: true,
      });
      doc.fontSize(12).fillColor("#7F8C8D").text(`Company: ${app.company}`);
      doc.text(
        `Application Date: ${moment(app.applicationDate).format(
          "MMMM Do YYYY, dddd"
        )}`
      );
      doc.text(`Status: ${app.status}`);
      doc.text(
        `Follow-Up Date: ${moment(app.followUpDate).format(
          "MMMM Do YYYY, dddd"
        )}`
      );
      doc.text(`Location: ${app.location}`);
      doc.text(`UUID: ${app.uuid}`);
      doc.moveDown(1);

      if ((index + 1) % 3 === 0) {
        doc.addPage();
      }
    });

    // Finalize the PDF and end the stream
    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, `summary_${req.user.id}.pdf`);
    });
  } catch (err) {
    console.error(err);
    req.flash(
      "error_msg",
      "Something went wrong while generating the summary report."
    );
    res.redirect("/jobApplications");
  }
});

// Add Job Application Page
router.get("/add", ensureAuthenticated, (req, res) =>
  res.render("addJobApplication", { title: "Add Job Application" })
);
// Route to handle analytics dashboard
router.get("/analytics", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplications = await JobApplication.find({ user: req.user.id });

    // Calculate total applications and success rate
    const totalApplications = jobApplications.length;
    const successApplications = jobApplications.filter(
      (app) => app.status === "offered"
    ).length;
    const successRate = (
      (successApplications / totalApplications) *
      100
    ).toFixed(2);

    // Calculate average response time
    const responseTimes = jobApplications
      .filter((app) => app.followUpDate)
      .map(
        (app) =>
          (new Date(app.followUpDate) - new Date(app.applicationDate)) /
          (1000 * 60 * 60 * 24)
      );
    const averageResponseTime = (
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    ).toFixed(2);

    // Calculate counts based on status
    const totalInterviews = jobApplications.filter(
      (app) => app.status === "interviewed"
    ).length;
    const totalOffers = jobApplications.filter(
      (app) => app.status === "offered"
    ).length;
    const totalRejections = jobApplications.filter(
      (app) => app.status === "rejected"
    ).length;

    // Calculate success rates by industry
    const industryStats = jobApplications.reduce((acc, app) => {
      if (!acc[app.industry]) acc[app.industry] = { total: 0, success: 0 };
      acc[app.industry].total += 1;
      if (app.status === "offered") acc[app.industry].success += 1;
      return acc;
    }, {});

    // Get recent applications with serial number
    const recentApplications = jobApplications
      .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate)) // Sort by application date, newest first
      .slice(0, 10) // Get the most recent 10 applications
      .map((job, index) => ({
        serialNo: index + 1,
        uuid: job.uuid,
        company: job.company,
        jobTitle: job.jobTitle,
        applicationDate: job.applicationDate,
        status: job.status,
        followUpDate: job.followUpDate,
        location: job.location,
      }));

    // Log the variables to check their values
    console.log("totalApplications:", totalApplications);
    console.log("totalInterviews:", totalInterviews);
    console.log("totalOffers:", totalOffers);
    console.log("totalRejections:", totalRejections);
    console.log("successRate:", successRate);
    console.log("averageResponseTime:", averageResponseTime);

    res.render("analytics", {
      title: "Analytics Dashboard",
      totalApplications,
      successRate,
      averageResponseTime,
      totalInterviews,
      totalOffers,
      totalRejections,
      industryStats: JSON.stringify(industryStats),
      filteredApplications: recentApplications, // Pass recent applications to the template
    });
  } catch (err) {
    console.error(err);
    res.render("analytics", { errors: [{ msg: "Something went wrong" }] });
  }
});

// View Job Applications
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplications = await JobApplication.find({
      user: req.user.id,
    }).sort({ serialNo: 1 });
    res.render("viewJobApplications", {
      title: "View Job Applications",
      jobApplications,
    });
  } catch (err) {
    console.error(err);
    res.render("viewJobApplications", {
      errors: [{ msg: "Something went wrong" }],
    });
  }
});

// Edit Job Application Page
router.get("/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplication = await JobApplication.findById(req.params.id);
    if (!jobApplication) {
      req.flash("error_msg", "Job application not found");
      return res.redirect("/jobApplications");
    }
    res.render("editJobApplication", {
      title: "Edit Job Application",
      jobApplication,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/jobApplications");
  }
});

// Handle Edit Job Application
router.post("/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const {
      company,
      jobTitle,
      applicationDate,
      status,
      followUpDate,
      location,
    } = req.body;
    const jobApplication = await JobApplication.findById(req.params.id);
    if (!jobApplication) {
      req.flash("error_msg", "Job application not found");
      return res.redirect("/jobApplications");
    }

    jobApplication.company = company;
    jobApplication.jobTitle = jobTitle;
    jobApplication.applicationDate = applicationDate;
    jobApplication.status = status;
    jobApplication.followUpDate = followUpDate;
    jobApplication.location = location;

    await jobApplication.save();
    req.flash("success_msg", "Job application updated successfully");
    res.redirect("/jobApplications");
  } catch (err) {
    console.error(err);
    res.render("editJobApplication", {
      errors: [{ msg: "Something went wrong" }],
      jobApplication: req.body,
    });
  }
});

// Handle Delete Job Application
router.post("/delete/:id", ensureAuthenticated, async (req, res) => {
  try {
    const jobApplication = await JobApplication.findByIdAndDelete(
      req.params.id
    );
    if (!jobApplication) {
      req.flash("error_msg", "Job application not found");
      return res.redirect("/jobApplications");
    }

    // Recalculate and update serial numbers
    const jobApplications = await JobApplication.find({
      user: req.user.id,
    }).sort({ serialNo: 1 });
    for (let i = 0; i < jobApplications.length; i++) {
      jobApplications[i].serialNo = i + 1;
      await jobApplications[i].save();
    }

    req.flash("success_msg", "Job application deleted successfully");
    res.redirect("/jobApplications");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/jobApplications");
  }
});

module.exports = router;

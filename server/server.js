const path = require("path");
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Windows often fails MongoDB SRV lookups via the system resolver.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const groupRoutes = require("./routes/groupRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", (req, res, next) => {
  if (req.query.download === "1") {
    res.setHeader("Content-Disposition", "attachment");
  } else if (path.extname(req.path).toLowerCase() === ".pdf") {
    res.setHeader("Content-Disposition", "inline");
  }
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "ScholarHub API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`ScholarHub server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
  }
};

startServer();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        message: `This email is already registered as a ${existingUser.role.toUpperCase()}. Please sign in instead.`,
        existingRole: existingUser.role,
      });
    }

    const allowedRoles = ["student", "teacher", "researcher", "admin"];
    const assignedRole = allowedRoles.includes(role) ? role : "student";

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      department: department || "",
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(" "),
      });
    }

    console.error("Register error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to register. Please try again later.",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account was found with that email address.",
      });
    }

    const demoMode = process.env.NODE_ENV !== "production";
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    if (!demoMode && !emailConfigured) {
      return res.status(503).json({
        success: false,
        message: "Password reset email is temporarily unavailable.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    if (demoMode) {
      console.log("🔐 ScholarHub OTP for " + normalizedEmail + ": " + otp);
      return res.json({
        success: true,
        message: "Verification code generated.",
        demoOtp: otp,
      });
    } else {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: "ScholarHub password reset verification",
        text: `Your ScholarHub password reset OTP is ${otp}. It expires in 10 minutes.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send a password reset OTP. Please try again later.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again later.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const selectableRoles = ["student", "teacher", "researcher"];
    const selectedRole =
      typeof role === "string" ? role.trim().toLowerCase() : role;
    if (selectedRole !== undefined && !selectableRoles.includes(selectedRole)) {
      return res.status(400).json({
        success: false,
        message: "Role must be student, teacher, or researcher.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (selectedRole && user.role !== "admin" && selectedRole !== user.role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as a ${user.role}. Select the matching role to sign in.`,
      });
    }

    const activeRole = user.role === "admin" ? user.role : selectedRole || user.role;
    const token = generateToken(user._id, activeRole);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        ...user.toSafeObject(),
        role: activeRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again later.",
    });
  }
});

router.get("/me", protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
});

module.exports = router;

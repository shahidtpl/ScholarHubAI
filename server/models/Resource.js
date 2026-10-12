const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    userRole: {
      type: String,
      trim: true,
      default: "",
    },
    // Retained for compatibility with comments created by earlier clients.
    name: {
      type: String,
      trim: true,
      default: "",
    },
    text: {
      type: String,
      trim: true,
      required: [true, "Comment text is required"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Review cannot exceed 2000 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    author: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Books",
          "Research Papers",
          "Dissertations",
          "Seminar Reports",
          "Lecture Notes",
        ],
        message: "Invalid category",
      },
    },
    year: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    fileName: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    uploaderName: {
      type: String,
      default: "Academic Contributor",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status must be pending, approved, or rejected",
      },
      default: "approved",
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
    aiSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ratings: {
      type: [ratingSchema],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    downloadsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ title: "text", description: "text", author: "text", tags: "text" });
resourceSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model("Resource", resourceSchema);

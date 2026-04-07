const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    itemCategory: {
      type: String,
      enum: ["task", "assignment"],
      default: "assignment"
    },
    subject: {
      type: String,
      default: "General",
      trim: true
    },
    course: {
      type: String,
      default: "",
      trim: true
    },
    assignmentType: {
      type: String,
      enum: ["Task", "Assignment", "Homework", "Project", "Exam Prep", "Notes", "Presentation"],
      default: "Assignment"
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    deadline: {
      type: Date,
      required: true
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    },
    completed: {
      type: Boolean,
      default: false
    },
    file: {
      type: String,
      default: ""
    },
    submissionFile: {
      type: String,
      default: ""
    },
    submittedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Task", taskSchema);

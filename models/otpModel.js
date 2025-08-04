const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
    },
    otp: {
      type: Number,
      required: true,
    },
    otpToken: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["verify-email", "reset-password"],
      required: true,
    },
  },
  { tamestamps: true }
);

const otpModel = mongoose.model("otps", schema);

module.exports = otpModel;

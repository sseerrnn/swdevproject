const mongoose = require("mongoose");
const { operationSchema } = require("./Shop");

const ReservationSchema = new mongoose.Schema({
  resvDate: {
    type: Date,
    required: true,
  },
  resvTime: {
    type: operationSchema,
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  shop: {
    type: mongoose.Schema.ObjectId,
    ref: "Shop",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Reservation", ReservationSchema);

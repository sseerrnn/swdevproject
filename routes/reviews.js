const express = require("express");
const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
  getStats,
} = require("../controllers/reviews");
const { protect, authorize } = require("../middleware/auth");
const Shop = require("../models/Shop");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(protect, getReviews)
  .post(protect, authorize("admin", "user"), addReview);

router
  .route("/:id")
  .get(protect, getReview)
  .put(protect, authorize("admin", "user"), updateReview)
  .delete(protect, authorize("admin", "user"), deleteReview);

router.route("/stats/:shopId").get(protect, getStats);

module.exports = router;

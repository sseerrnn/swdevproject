const Review = require("../models/Review");
const Shop = require("../models/Shop");

//@desc Get all reviews
//@route GET /api/v1/reviews
//@access Public
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: "shop",
        select: "name description tel",
      })
      .populate({
        path: "user",
        select: "name tel email",
      });

    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Get single review
//@route GET /api/v1/reviews/:id
//@access Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate({
        path: "shop",
        select: "name description tel",
      })
      .populate({
        path: "user",
        select: "name tel email",
      });

    if (!review) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({ success: true, data: review });
  } catch {
    res.status(400).json({ success: false });
  }
};

// @desc Add new review
// @route POST /api/v1/reviews
// @access Private
exports.addReview = async (req, res, next) => {
  try {
    req.body.user = req.user.id;
    const shop = await Shop.findById(req.body.shop);

    if (!shop) {
      return res.status(400).json({ success: false });
    }

    const review = await Review.create(req.body);

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc Update review
// @route PUT /api/v1/reviews/:id
// @access Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(400).json({ success: false });
    }
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized to update review" });
    }

    review = await Review.findByIdAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc Delete review
// @route DELETE /api/v1/reviews/:id
// @access Private
exports.deleteReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(400).json({ success: false });
    }
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized to delete review" });
    }

    await review.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

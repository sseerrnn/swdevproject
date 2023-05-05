const Review = require("../models/Review");
const Shop = require("../models/Shop");
const mongoose = require("mongoose");

//desc update shop average rating
//@access Private
const updateAverageRating = async (shopId) => {
  const obj = await Review.aggregate([
    {
      $match: { shop: shopId },
    },
    {
      $group: {
        _id: "$shop",
        averageRating: { $avg: "$rating" },
      },
    },
  ]);
  try {
    await Shop.findByIdAndUpdate(shopId, {
      averageRating: obj[0].averageRating,
    });
  } catch (err) {
    console.log(err);
  }
};

//@desc Get all reviews
//@route GET /api/v1/reviews
//@access Public
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: "shop",
        select: "name address tel",
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
        select: "name address tel",
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
  //using transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    req.body.user = req.user.id;
    const review = await Review.create(req.body);
    await review.save({ session: session });
    await updateAverageRating(review.shop);
    await session.commitTransaction();
    res.status(200).json({ success: true, data: review });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc Update review
// @route PUT /api/v1/reviews/:id
// @access Private
exports.updateReview = async (req, res, next) => {
  //using transaction
  const session = await mongoose.startSession();
  session.startTransaction();
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
    await review.save({ session: session });
    await updateAverageRating(review.shop);
    await session.commitTransaction();

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc Delete review
// @route DELETE /api/v1/reviews/:id
// @access Private
exports.deleteReview = async (req, res, next) => {
  //using transaction
  const session = await mongoose.startSession();
  session.startTransaction();
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
    await review.remove({ session: session });
    await updateAverageRating(review.shop);
    await session.commitTransaction();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc Get stats each shop
// @route GET /api/v1/reviews/stats/:shopId
// @access Private
exports.getStats = async (req, res, next) => {
  console.log(req.params.shopId);

  try {
    const stats = await Review.aggregate([
      {
        $match: { shop: mongoose.Types.ObjectId(req.params.shopId) },
      },

      {
        $group: {
          _id: "$shop",
          numReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          max: { $max: "$rating" },
          min: { $min: "$rating" },
        },
      },
    ]);
    const numReviewsEachRating = await Review.aggregate([
      {
        $match: { shop: mongoose.Types.ObjectId(req.params.shopId) },
      },

      {
        $group: {
          _id: "$rating",
          numReviews: { $sum: 1 },
        },
      },
      {
        $set: {
          rating: "$_id",
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);
    stats[0].numReviewsEachRating = numReviewsEachRating;
    res.status(200).json({ success: true, data: stats[0] });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

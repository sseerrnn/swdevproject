const Shop = require("../models/Shop");

//@desc Get all shops
//@route GET /api/v1/shops
//@access Public
exports.getShops = async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ["select", "sort", "page", "limit"];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);
  console.log(reqQuery);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // Finding resource
  query = Shop.find(JSON.parse(queryStr)).populate("reservations");

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Shop.countDocuments();

  query = query.skip(startIndex).limit(limit);

  try {
    // Executing query
    const shops = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }
    res.status(200).json({
      success: true,
      count: shops.length,
      pagination,
      data: shops,
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Get single shop
//@route GET /api/v1/shops/:id
//@access Public
exports.getShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({ success: true, data: shop });
  } catch {
    res.status(400).json({ success: false });
  }
};

//@desc Create new shop
//@route POST /api/v1/shops
//@access Private
exports.createShop = async (req, res, next) => {
  try {
    // verify operation field
    if (req.body.operation) {
      // check length of operation array
      if (req.body.operation.length != 7) {
        return res.status(400).json({
          success: false,
          message: "Operation field must have 7 elements",
        });
      }

      req.body.operation.forEach((op) => {
        // check if start is less than end
        if (op.start > op.end) {
          return res.status(400).json({
            success: false,
            message: "Start time must be less than end time",
          });
        }

        // check if start and end are in 24 * 60 minutes format
        if (op.start < 0 || op.start > 1440 || op.end < 0 || op.end > 1440) {
          return res.status(400).json({
            success: false,
            message:
              "Start and end time must be in between 0 - 1440 minutes format",
          });
        }
      });
    }
    const shop = (await Shop.create(req.body)).toObject();
    delete shop.__v;
    delete shop.id;
    res.status(200).json({ success: true, data: shop });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc Update shop
//@route PUT /api/v1/shops/:id
//@access Private
exports.updateShop = async (req, res, next) => {
  try {
    const shop = (
      await Shop.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
    ).toObject();

    if (!shop) {
      return res.status(400).json({ success: false });
    }

    delete shop.__v;
    delete shop.id;
    res.status(200).json({ success: true, data: shop });
  } catch {
    res.status(400).json({ success: false });
  }
};

//@desc Delete shop
//@route DELETE /api/v1/shops/:id
//@access Private
exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: `Bootcamp not found with id of ${req.params.id}`,
      });
    }

    shop.remove();
    res.status(200).json({ success: true, data: {} });
  } catch {
    res.status(400).json({ success: false });
  }
};

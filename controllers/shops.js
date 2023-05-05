const Shop = require("../models/Shop");
const Reservation = require("../models/Reservation");

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
      return res.status(404).json({ success: false });
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

      var isValid = {
        statusCode: 200,
        message: "success",
      };
      req.body.operation.every((op) => {
        // parse start and end time to number
        op.start = Number(op.start);
        op.end = Number(op.end);

        // check if start is less than end
        if (op.start > op.end) {
          isValid = {
            statusCode: 400,
            message: "Start time must be less than end time",
          };
          return false;
        }

        // check if start and end are in 24 * 60 minutes format
        if (op.start < 0 || op.start > 1440 || op.end < 0 || op.end > 1440) {
          isValid = {
            statusCode: 400,
            message:
              "Start and end time must be in between 0 - 1440 minutes format",
          };
          return false;
        }
        return true;
      });

      if (isValid.statusCode != 200) {
        return res.status(isValid.statusCode).json({
          success: false,
          message: isValid.message,
        });
      }
    }
    const shop = (await Shop.create(req.body)).toObject();
    delete shop.__v;
    delete shop.id;
    res.status(200).json({ success: true, data: shop });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc Update shop
//@route PUT /api/v1/shops/:id
//@access Private
exports.updateShop = async (req, res, next) => {
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
    const shop = (
      await Shop.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
    ).toObject();

    if (!shop) {
      return res.status(404).json({ success: false });
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
      return res.status(404).json({
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

//@desc Get schedule for reservation
//@route GET /api/v1/shops/:id/schedule
//@access Public
exports.getShopSchedule = async (req, res, next) => {
  try {
    var start = new Date(req.query.date);
    // Get current day number, converting Sun. to 7
    var day = start.getDay() || 7;
    // Only manipulate the date if it isn't Mon.
    if (day !== 1) start.setHours(-24 * (day - 1)); // Set the hours to day number minus 1 and multiplied by negative 24

    var end = new Date(start.valueOf() + 7 * 24 * 60 * 60 * 1000 - 1);

    const reservations = await Reservation.find({
      shop: req.params.id,
      date: { $gte: start, $lte: end },
    });

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false });
    }

    // initialize schedule array
    var schedule = [];
    for (var i = 0; i < 7; i++) {
      operation = new Array(48).fill(0);
      var employee = shop.operation[i].employee;
      var opStart = shop.operation[i].start;
      var opEnd = shop.operation[i].end;
      for (var j = opStart; j < opEnd; j += 30) {
        operation[Math.floor(j / 30)] = employee;
      }
      schedule.push({
        date: new Date(start.valueOf() + i * 24 * 60 * 60 * 1000),
        slots: operation,
      });
    }

    reservations.forEach((reservation) => {
      var date = new Date(reservation.resvDate);
      // Get current day number, converting Sun. to 7
      var day = date.getDay() || 7;
      // Only manipulate the date if it isn't Mon.
      if (day !== 1) date.setHours(-24 * (day - 1)); // Set the hours to day number minus 1 and multiplied by negative 24
      var index = Math.floor(
        (reservation.resvDate.valueOf() - date.valueOf()) /
          (24 * 60 * 60 * 1000)
      );
      var start = Math.floor(reservation.resvTime.start / 30);
      var end = Math.floor(reservation.resvTime.end / 30);
      for (var i = start; i < end; i++) {
        schedule[index].slots[i] -= 1;
      }
    });

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false });
  }
};

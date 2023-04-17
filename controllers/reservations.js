const Reservation = require("../models/Reservation");
const Shop = require("../models/Shop");

//@desc Get all reservations
//@route GET /api/v1/reservations
//@access Public
exports.getReservations = async (req, res, next) => {
  let query;
  //General users can see only their own reservations
  if (req.user.role === "user") {
    query = Reservation.find({ user: req.user.id }).populate({
      path: "shop",
      select: "name address tel",
    });
  } else {
    //Admins can see all reservations
    query = Reservation.find().populate({
      path: "shop",
      select: "name address tel",
    });
  }
  try {
    const reservations = await query;
    res
      .status(200)
      .json({ success: true, count: reservations.length, data: reservations });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Cannot find Reservation" });
  }
};

//@desc Get single reservation
//@route GET /api/v1/reservations/:id
//@access Public
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate({
      path: "shop",
      select: "name description tel",
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `No reservation with the id of ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Cannot find Reservation" });
  }
};

//@desc Add reservation
//@route POST /api/v1/reservations
//@access Private
exports.addReservation = async (req, res, next) => {
  try {
    //Add user and shop to req.body
    req.body.user = req.user.id;
    req.body.shop = req.params.shopId;

    //Get index date of the week
    var date = new Date(req.body.resvDate);
    var day = date.getDay() || 7;
    if (day !== 1) date.setHours(-24 * (day - 1));
    var index = Math.floor(
      (new Date(req.body.resvDate).valueOf() - date.valueOf()) /
        (24 * 60 * 60 * 1000)
    );

    //Get shop
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: `No shop with the id of ${req.params.shopId}`,
      });
    }

    //Initialize schedule array
    var schedule = new Array(48).fill(false);
    for (
      var j = shop.operation[index].start;
      j < shop.operation[index].end;
      j += 30
    ) {
      schedule[Math.floor(j / 30)] = true;
    }

    //Fill schedule array with reservations
    const reservations = await Reservation.find({
      shop: req.params.shopId,
      resvDate: req.body.resvDate,
    });

    for (var i = 0; i < reservations.length; i++) {
      var start = Math.floor(reservations[i].resvTime.start / 30);
      var end = Math.floor(reservations[i].resvTime.end / 30);
      for (var j = start; j < end; j++) {
        schedule[j] = false;
      }
    }

    //Check if the reservation is available
    var start = Math.floor(req.body.resvTime.start / 30);
    var end = Math.floor(req.body.resvTime.end / 30);
    for (var i = start; i < end; i++) {
      if (!schedule[i]) {
        return res.status(400).json({
          success: false,
          message: `The shop with ID ${req.params.shopId} is not available at this time`,
        });
      }
    }

    //Check for existed reservation
    const existedReservation = await Reservation.find({
      user: req.user.id,
      shop: req.params.shopId,
    });

    //If the user is not an admin, they can only create 3 reservations
    if (existedReservation.length >= 3 && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 3 reservations`,
      });
    }

    const reservation = await Reservation.create(req.body);

    res.status(201).json({
      success: true,
      data: reservation,
    });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Cannot create Reservation" });
  }
};

//@desc Update reservation
//@route PUT /api/v1/reservations/:id
//@access Private
exports.updateReservation = async (req, res, next) => {
  try {
    let reservation = await Reservation.findById(req.params.id);
    // Make sure user is the reservation owner
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this reservation`,
      });
    }

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `No reservation with the id of ${req.params.id}`,
      });
    }

    reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Cannot update Reservation" });
  }
};

//@desc Delete reservation
//@route DELETE /api/v1/reservations/:id
//@access Private
exports.deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    // Make sure user is the reservation owner
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this reservation`,
      });
    }

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: `No reservation with the id of ${req.params.id}`,
      });
    }

    await reservation.remove();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Cannot delete Reservation" });
  }
};

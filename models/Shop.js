const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      unique: true,
      trim: true,
      maxlength: [50, "Name can not be more than 50 characters"],
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
      maxlength: [150, "Address can not be more than 50 characters"],
    },
    tel: {
      type: String,
      required: [true, "Please add a phone number"],
      match: [
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
        "Please add a valid phone number",
      ],
    },
    openTime: {
      type: String,
      required: [true, "Please add open-close time"],
      maxlength: [50, "Open-close time can not be more than 50 characters"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Reverse populate with virtuals
ShopSchema.virtual("reservation", {
  ref: "Reservation",
  localField: "_id",
  foreignField: "shop",
  justOne: false,
});

//Cascade delete reservation when a shop is deleted
ShopSchema.pre("remove", async function (next) {
  console.log(`Reservation being removed from shop ${this._id}`);
  await this.model("Reservation").deleteMany({ shop: this._id });
  next();
});

module.exports = mongoose.model("Shop", ShopSchema);
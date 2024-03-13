// * Updated

const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");

// reset password Token
exports.resetPasswordToken = async (req, res) => {
  try {
    // get email
    const email = req.body.email;

    // check user for this email
    const user = await User.findOne({ email: email });

    // email validation

    if (!user) {
      return res.json({
        success: false,
        message: "Your Email is incorrect. Please try again",
      });
    }

    // generate token
    const token = crypto.randomUUID();

    // update user by adding token and expiration time

    const updatedDetails = await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPasswordExpires: Date.now() + 5 * 60 * 1000,
      },
      {
        new: true,
      }
    );

    // create url

    const url = `http://localhost:3000/update-password/${token}`;

    // send mail contain url
    await mailSender(
      email,
      "Password Reset",
      `Your Link for email verification is ${url}. Please click this url to reset your password.`
    );

    // return response
    return res.json({
      success: true,
      message: "Reset Password mail send successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong to sendReset Password mail",
    });
  }
};

//  reset password
exports.resetPassword = async (req, res) => {
  try {
    // data fetch
    const { password, confirmPassword, token } = req.body;
    console.log(token);
    // validation
    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: "Password is not matched",
      });
    }
    // console.log(password, confirmPassword);

    // get user details for db using token
    const userDetails = await User.findOne({ token: token });

    console.log(userDetails);

    // if no entry
    if (!userDetails) {
      return res.json({
        success: false,
        message: "Token is invalid",
      });
    }
    console.log(password, confirmPassword);
    // time validation
    if (userDetails.resetPasswordExpires < Date.now()) {
      return res.json({
        success: false,
        message: "Token is expired",
      });
    }

    // hash the password

    const hashedPassword = await bcrypt.hash(password, 10);

    // password update
    await User.findOneAndUpdate(
      { token: token },
      { password: hashedPassword },
      { user: true }
    );

    // return response
    return res.status(200).json({
      success: true,
      message: "Password reset is Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to reset the password",
    });
  }
};

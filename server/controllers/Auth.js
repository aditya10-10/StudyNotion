// * Updated

const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require("dotenv").config();

// otp send
exports.sendOTP = async (req, res) => {
  try {
    // fetch email
    const { email } = req.body;

    // check user is present

    const checkUserPresent = await User.findOne({ email: email });

    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User already exists",
      });
    }

    // generate otp+    trt

    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    console.log("Otp Generated", otp);
    // check otp is unique or not

    // var res = await OTP.findOne({ otp: otp });

    let existingOTP = await OTP.findOne({ otp: otp });

    while (existingOTP) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      existingOTP = await OTP.findOne({ otp: otp });
    }

    // create entry in database

    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    console.log(otpBody);

    // return response

    return res.status(200).json({
      success: true,
      message: "OTP sent Successfully",
      otp,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "error to send otp",
    });
  }
};

// Sign up for new users
exports.signUp = async (req, res) => {
  try {
    // data fetch
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body;

    // validate
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "all field required in signup",
      });
    }

    // match both password
    if (password !== confirmPassword) {
      return res.status(403).json({
        success: false,
        message: "Password not matched",
      });
    }
    // check user exist or not

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }
    // find most recent otp for user store in database
    const recentOtp = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);

    console.log("recent otp", recentOtp[0].otp);
    // validate otp

    if (recentOtp.length == 0) {
      return res.status(403).json({
        success: false,
        message: "Otp not found",
      });
    } else if (otp !== recentOtp[0].otp) {
      return res.status(403).json({
        success: false,
        message: "invalid Otp",
      });
    }
    // hash the password

    const hashedPassword = await bcrypt.hash(password, 10);

    // create entry in database
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    });

    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName} ${lastName}`,
    });
    // return response
    return res.status(200).json({
      success: true,
      message: "User Successfully SignUp",
      user: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "user cannot sign up try again later",
    });
  }
};

// Login with existing users

exports.login = async (req, res) => {
  try {
    // get data
    const { email, password } = req.body;
    // console.log(email, password);

    // validation of data
    if (!email || !password) {
      return res.status(401).json({
        success: false,
        message: "entry password and email for login",
      });
    }

    // user check exists or not
    const user = await User.findOne({ email }).populate("additionalDetails");
    // console.log(user);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "user not exists signup first",
      });
    }

    // generate jwt , after matching password
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { email: user.email, id: user._id, accountType: user.accountType },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      // Save token to user document in database
      user.token = token;
      user.password = undefined;

      // Set cookie for token and return success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      // console.log(options);

      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: `User Login Success`,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Error to Login password is incorrect",
      });
    }

    // create cookie and send response
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User unable to login",
    });
  }
};

// ! Need to correct when error occurs

// change password
// ! TODO : HomeWork
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const { oldPassword, newPassword } = req.body;

    const userDetails = await User.findById(userId);

    if (!userDetails) {
      return res.status(401).json({
        success: false,
        message: "User is not Found",
      });
    }

    const passwordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Enter the correct old password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedPassword = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    // Send notification email
    try {
      const emailResponse = await mailSender(
        userDetails.email,
        "Password for your account has been updated",
        passwordUpdated(
          userDetails.email,
          `Password updated successfully for ${userDetails.firstName} ${userDetails.lastName}`
        )
      );
      console.log("Email sent successfully:", emailResponse.response);
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User unable to change password",
    });
  }
};

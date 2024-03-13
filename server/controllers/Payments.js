//* updated
const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const {
  courseEnrollmentMail, courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentMail");
const {
  paymentSuccessEmail,
} = require("../mail/templates/paymentSuccessEmail");

// capture the payment and initiate the payment order

exports.capturePayment = async (req, res) => {
  // fetch data course id and user id
  const { course_id } = req.body;
  const user_id = req.user.id;
  // validate the course id and user id
  // valid userId
  if (!course_id || !user_id) {
    return res.status(500).json({
      success: false,
      message: "courseId and userId is required",
    });
  }
  // valid course details
  let course;
  try {
    course = await Course.findById(course_id);
    if (!course) {
      return res.status(500).json({
        success: false,
        message: "course not found",
      });
    }

    // user already purchased the course
    const uid = new mongoose.Types.ObjectId(user_id);
    if (course.studentsEnrolled.includes(uid)) {
      return res.status(500).json({
        success: false,
        message: "user already purchased the course",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "error to find  course",
    });
  }

  // create order
  const amount = course.price;
  const currency = "INR";

  const options = {
    amount: amount * 100,
    currency,
    receipt: Math.random(Date.now()).toString(),
    notes: {
      courseId: course_id,
      user_Id,
    },
  };

  try {
    const paymentResponse = await instance.orders.create(options);
    console.log(paymentResponse);
    return res.status(200).json({
      success: true,
      data: paymentResponse,
      courseName: course.courseDescription,
      thumbnail: course.thumbnail,
      orderId: paymentResponse.id,
      amount: paymentResponse.amount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "error to create order",
    });
  }
};

// verify order of razorpay and server

exports.verifyOrder = async (req, res) => {
  const webhookSecret = "546941686";

  const signature = req.headers["x-razorpay-signature"];

  const shasum = crypto.createHmac("sha256", webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  } else if (digest === signature) {
    console.log("request is verified");

    const { courseId, userId } = req.body.payload.payment.entity.notes;
    try {
      // fulfill the action

      // find the course and update the studentsEnrolled
      const enrolledCourse = await Course.findByIdAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true }
      );
      if (!enrolledCourse) {
        return res.status(500).json({
          success: false,
          message: "error to enroll course",
        });
      }
      console.log(enrolledCourse);

      // find the user and update the enrolledCourses
      const enrolledStudent = await User.findByIdAndUpdate(
        { _id: userId },
        { $push: { courses: courseId } },
        { new: true }
      );

      if (!enrolledStudent) {
        return res.status(500).json({
          success: false,
          message: "error to update user",
        });
      }
      console.log(enrolledStudent);

      // mail to user for course enrollment
      const emailResponse = await mailSender(
        enrolledStudent.email,
        "Course Enrollment",
        "courseEnrollmentMail enrolling the course"
      );

      console.log(emailResponse);
      return res.status(200).json({
        success: true,
        message: "course enrolled successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "error to find  course",
      });
    }
  }
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );
  } catch (error) {
    console.log("error in sending mail", error);
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" });
  }
};

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please Provide Course ID and User ID",
    });
  }

  for (const courseId of courses) {
    try {
      const enrolledCourse = await Course.findByIdAndUpdate(
        { _id: courseId },
        { $psuh: { studentsEnrolled: userId } },
        { new: true }
      );
      if (!enrolledCourse) {
        return res
          .status(500)
          .json({ success: false, error: "Course not found" });
      }
      console.log("Updated course: ", enrolledCourse);

      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      );
      console.log("Enrolled student: ", enrolledStudent);
      // Send an email notification to the enrolled student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      );
    } catch (error) {
      console.log(error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }
};

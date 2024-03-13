// Import the required modules
const express = require("express");
const router = express.Router();

const {
  capturePayment,
  verifyOrder,
  //   sendPaymentSuccessEmail,
} = require("../controllers/Payments");
const {
  auth,
  isInstructor,
  isStudent,
  isAdmin,
} = require("../middleware/auth");
router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("/verifyOrder", auth, isStudent, verifyOrder);
// router.post(
//   "/sendPaymentSuccessEmail",
//   auth,
//   isStudent,
//   sendPaymentSuccessEmail
// );

module.exports = router;

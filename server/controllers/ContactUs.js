const {
  contactUsMail,
  contactUsEmail,
} = require("../mail/templates/contactForm");
const mailSender = require("../utils/mailSender");

exports.contactUsController = async (req, res) => {
  try {
    const { email, firstName, lastName, message, phoneNo, countryCode } =
      req.body;

    const emailResult = await mailSender(
      email,
      "Your Data send Successfully",
      contactUsEmail(email, firstName, lastName, message, phoneNo, countryCode)
    );

    console.log(emailResult);
    // return response
    return res.status(200).json({
      success: true,
      message: "Email Send Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Something went wrong...",
    });
  }
};

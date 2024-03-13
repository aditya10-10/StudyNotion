// * Updated

const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const Category = require("../models/Category");

// create rating and review
exports.createRating = async (req, res) => {
  try {
    // get user id
    const userId = req.user.id;

    // fetch user id
    const { rating, review, courseId } = req.body;

    // check if user enrolled or not
    const courseDetails = await Course.findOne({
      _id: courseId,
      studentsEnrolled: { $eleMatch: { $eq: userId } },
    });

    if (!courseDetails) {
      return res.status(500).json({
        success: false,
        message: "user not enrolled",
      });
    }
    // check user already rated or not
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId,
    });

    if (alreadyReviewed) {
      return res.status(500).json({
        success: false,
        message: "user already reviewed the course",
      });
    }
    // create rating and review
    const ratingAndReview = await RatingAndReview.create({
      user: userId,
      course: courseId,
      rating,
      review,
    });

    // update course rating and review
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: { ratingAndReview: ratingAndReview._id },
      },
      { new: true }
    );

    console.log(updatedCourseDetails);

    // return response
    res.status(200).json({
      success: true,
      message: "Rating and review created successfully",
      data: ratingAndReview,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "error to create rating and review",
    });
  }
};

// get average rating and review
exports.getAverageRating = async (req, res) => {
  try {
    // get course id
    const courseId = req.body.courseId;
    // calculate average rating
    const result = await RatingAndReview.aggregate(
      {
        $match: { course: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      }
    );
    // return rating
    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        averageRating: result[0].averageRating,
      });
    }
    // if no rating and review found
    return res.status(200).json({
      success: true,
      message: "Average rating",
      averageRating: 0,
    });
    // return response
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "error to get average rating and review",
    });
  }
};

// get all rating and review
exports.getAllRating = async (req, res) => {
  try {
    const allRatingAndReview = await RatingAndReview.find({})
      .sort({ rating: "desc" })
      .populate({
        path: "user",
        select: "firstName lastName image email",
      })
      .populate({
        path: "course",
        select: "courseName",
      })
      .exec();

    //   return response
    res.status(200).json({
      success: true,
      message: "All rating and review",
      data: allRatingAndReview,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "error to get all rating and review",
    });
  }
};

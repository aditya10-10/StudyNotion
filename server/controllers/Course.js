// * Updated
const Course = require("../models/Course");
const Category = require("../models/Category");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const User = require("../models/User");

const { uploadImageToCloudinary } = require("../utils/imageUploader");

// create course handler function
exports.createCourse = async (req, res) => {
  try {
    // fetch data
    const {
      courseName,
      courseDescription,
      whatYouWillLearn,
      tag,
      price,
      category,
      status,
      instructions,
    } = req.body;
    console.log(status);
    // get thumbnail
    const thumbnail = req.files.thumbnailImage;
    console.log(thumbnail);

    // validation
    if (
      !courseName ||
      !courseDescription ||
      !category ||
      !price ||
      !thumbnail
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the fields",
      });
    }

    // check for instructor
    const userID = req.user.id;
    console.log(userID);

    // ! TODO: Verify that userId and instructor are same or different?
    const instructorDetails = await User.findById(userID, {
      accountType: "Instructor",
    });
    console.log("instructor details", instructorDetails);

    if (!instructorDetails) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // check category validation

    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // upload image
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      process.env.FOLDER_NAME
    );

    console.log(thumbnailImage);

    // create entry in database
    const courseDetails = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      instructions,
      status,
    });

    await User.findByIdAndUpdate(
      { _id: instructorDetails._id },
      {
        $push: { courses: courseDetails._id },
      },
      { new: true }
    );

    // ! Update category in Schema
    // ! Homework
    await Category.findByIdAndUpdate(
      { _id: category },
      {
        $push: { courses: categoryDetails._id },
      },
      { new: true }
    );

    // return response
    res.status(200).json({
      success: true,
      message: "Course created successfully",
      data: courseDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "error to create course",
    });
  }
};

// getAllCourses handler function
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find(
      {},
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReview: true,
        studentsEnrolled: true,
      }
    ).populate("category", "name description");

    res.status(200).json({
      success: true,
      message: "All courses",
      data: courses,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "error to get courses",
    });
  }
};

//  get Course details
exports.getCourseDetails = async (req, res) => {
  try {
    // fetch course id
    const { courseId } = req.body;
    console.log(courseId);
    const courseDetails = await Course.find({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReview")
      .populate({
        path: "courseContent",
        populate: {
          path: "SubSection",
        },
      })
      .exec();
    console.log(courseDetails);

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      });
    }
    // return response
    res.status(200).json({
      success: true,
      message: "Course details",
      data: courseDetails,
    });
  } catch (error) {
    // console.log(err);
    return res.status(500).json({
      success: false,
      message: "error to get course details",
    });
  }
};

// edit Course
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const updates = req.body;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // If Thumbnail Image is found, update it
    if (req.files && req.files.thumbnailImage) {
      console.log("thumbnail update");
      const thumbnail = req.files.thumbnailImage;
      const thumbnailImage = await uploadImageToCloudinary(
        thumbnail,
        process.env.FOLDER_NAME
      );
      course.thumbnail = thumbnailImage.secure_url;
    }

    // Update only the fields that are present in the request body
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === "tag" || key === "instructionss") {
          course[key] = JSON.parse(updates[key]);
        } else {
          course[key] = updates[key];
        }
      }
    }

    await course.save();

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReview")
      .populate({
        path: "courseContent",
        populate: {
          path: "SubSection",
        },
      })
      .exec();

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReview")
      .populate({
        path: "courseContent",
        populate: {
          path: "SubSection",
        },
      })
      .exec();

    // let courseProgressCount = await CourseProgres.findOne({
    //   courseID: courseId,
    //   userId: userId,
    // });

    // console.log("courseProgressCount : ", courseProgressCount);

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      });
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    // let totalDurationInSeconds = 0;
    // courseDetails.courseContent.forEach((content) => {
    //   content.subSection.forEach((subSection) => {
    //     const timeDurationInSeconds = parseInt(subSection.timeDuration);
    //     totalDurationInSeconds += timeDurationInSeconds;
    //   });
    // });

    // const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        // totalDuration,
        // completedVideos: courseProgressCount?.completedVideos
        //   ? courseProgressCount?.completedVideos
        //   : [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 });

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // find course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    // unenroll students form the course

    const studentsEnrolled = course.studentsEnrolled;
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: course },
      });
    }

    // delete sections and subSection
    const courseSection = course.courseContent;
    for (const sectionId of courseSection) {
      // delete sub section fo section
      const section = await Section.findById(sectionId);
      if (section) {
        const subSections = await section.SubSection;
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId);
        }
      }
      // delete section
      await Section.findByIdAndDelete(sectionId);
    }
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

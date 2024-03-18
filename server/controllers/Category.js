//* updated
const Category = require("../models/Category");
const mongoose = require("mongoose");

// create Category Handler

exports.createCategory = async (req, res) => {
  try {
    //  fetch data
    const { name, description } = req.body;
    // validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the fields",
      });
    }
    // create entry in database
    const CategoryDetails = await Category.create({
      name: name,
      description: description,
    });

    console.log(CategoryDetails);
    // return response
    res.status(200).json({
      success: true,
      message: "Category created successfully",
      data: CategoryDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "error to create Category",
    });
  }
};

// get all Category
exports.showAllCategories = async (req, res) => {
  try {
    const category = await Category.find({}, { name: true, description: true });
    res.status(200).json({
      success: true,
      message: "All category",
      data: category,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "error to get category",
    });
  }
};

// category Page details

exports.categoryPageDetails = async (req, res) => {
  try {
    // fetch category id
    const { categoryId } = req.body;

    // get course for specific category
    const selectedCategory = await Category.findById(categoryId)
      .populate("courses")
      .exec();

    // validate
    if (!selectedCategory) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // get course different categories
    const differentCategories = await Category.find({
      _id: { $ne: categoryId },
    })
      .populate("courses")
      .exec();

    // get top selling course
    // ! write the query to get top selling course
    const allCategory = await Category.find().populate({
      path: "courses",
      populate: {
        path: "instructor",
      },
    });

    const allCourses = allCategory.flatMap((category) => category.courses);
    const topSellingCourse = allCourses
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);
    // return response
    res.status(200).json({
      success: true,
      message: "Category page details",
      data: {
        selectedCategory,
        differentCategories,
        topSellingCourse,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "error to get category page details",
    });
  }
};

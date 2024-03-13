const cloudinary = require("cloudinary").v2;

exports.uploadImageToCloudinary = async (
  file,
  folder,
  height,
  quality,
  res
) => {
  try {
    const options = { folder };
    if (height) {
      options.height = height;
    }
    if (quality) {
      options.quality = quality;
    }
    options.resource_type = "auto";

    const tempFilePath = "StudyNotion"; // Replace "your_temp_file_path" with the actual temporary file path
    const uploadedResponse = await cloudinary.uploader.upload(
      file.tempFilePath,
      options
    );
    // console.log("uploadedResponse", uploadedResponse);

    return uploadedResponse;
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "error to upload image",
    });
  }
};

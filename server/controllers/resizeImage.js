const sharp = require('sharp');

const resizeImage = async (buffer, width, height) => {
  try {
    // Resize the image using sharp
    const resizedImageBuffer = await sharp(buffer)
      .resize(width, height)
      .toBuffer();
    return resizedImageBuffer;
  } catch (error) {
    throw new Error('Error resizing image: ' + error.message);
  }
};

module.exports = { resizeImage };
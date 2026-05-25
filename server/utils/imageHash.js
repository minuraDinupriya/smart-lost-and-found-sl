const sharp = require('sharp');

/**
 * Generates a 64-bit Perceptual Hash (pHash) string from an image buffer or file path.
 * The string will consist of '1's and '0's representing the binary structural fingerprint.
 */
const generateImageHash = async (filePath) => {
  try {
    // 1. Resize heavily to 8x8 (ignoring aspect ratio) to standardize structure
    // 2. Convert to grayscale
    // 3. Extract raw pixel buffer array
    const { data } = await sharp(filePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 4. Calculate the average (mean) pixel intensity
    let total = 0;
    for (let i = 0; i < data.length; i++) {
      total += data[i];
    }
    const average = total / data.length;

    // 5. Generate the 64-bit hash string based on the mean
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i] >= average ? '1' : '0';
    }

    return hash;
  } catch (error) {
    console.error('Error generating pHash:', error);
    return null; // Return null to gracefully degrade if image processing fails
  }
};

/**
 * Calculates the Hamming Distance between two hash strings of equal length.
 * A distance <= 10 typically indicates extremely high visual similarity (potential match).
 */
const calculateHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return null;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
};

module.exports = {
  generateImageHash,
  calculateHammingDistance
};

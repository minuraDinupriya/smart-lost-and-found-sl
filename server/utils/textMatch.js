const stringSimilarity = require('string-similarity');

/**
 * Calculates the textual similarity between two items using Dice's Coefficient.
 * @param {Object} item1 - The first item document (must have title and description)
 * @param {Object} item2 - The second item document (must have title and description)
 * @returns {number} - Similarity score between 0.0 and 1.0
 */
const calculateTextSimilarity = (item1, item2) => {
  const text1 = `${item1.title || ''} ${item1.description || ''}`.toLowerCase().trim();
  const text2 = `${item2.title || ''} ${item2.description || ''}`.toLowerCase().trim();

  // If either text is completely empty, we can't reliably compare
  if (!text1 || !text2) return 0;

  return stringSimilarity.compareTwoStrings(text1, text2);
};

module.exports = { calculateTextSimilarity };

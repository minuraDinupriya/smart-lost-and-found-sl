const stringSimilarity = require('string-similarity');

/**
 * Calculates match score between a Lost item and a Found item
 * Incorporates Title, Description, Brand, Model, Color, and AI attributes
 */
const calculateMatchScore = (lostItem, foundItem) => {
  // Hard constraints: Fail immediately if categories differ or if both are of the same type
  if (lostItem.category !== foundItem.category || lostItem.type === foundItem.type) {
    return 0;
  }

  // Extract extra attributes if present (Brand, Model, Color)
  const lostExtra = [lostItem.brand, lostItem.model, lostItem.color]
    .filter((val) => val && val !== 'Could not identify')
    .join(' ');
  const foundExtra = [foundItem.brand, foundItem.model, foundItem.color]
    .filter((val) => val && val !== 'Could not identify')
    .join(' ');

  // Normalize and concatenate all attributes for comprehensive string similarity evaluation
  const lostText = `${lostItem.title} ${lostItem.description} ${lostExtra}`.toLowerCase();
  const foundText = `${foundItem.title} ${foundItem.description} ${foundExtra}`.toLowerCase();

  // Compute text similarity using Dice's Coefficient
  let score = stringSimilarity.compareTwoStrings(lostText, foundText);

  // Precision boost if exact Brand or Model match exists
  if (
    lostItem.brand &&
    foundItem.brand &&
    lostItem.brand !== 'Could not identify' &&
    lostItem.brand.toLowerCase() === foundItem.brand.toLowerCase()
  ) {
    score = Math.min(1.0, score + 0.10);
  }

  if (
    lostItem.model &&
    foundItem.model &&
    lostItem.model !== 'Could not identify' &&
    lostItem.model.toLowerCase() === foundItem.model.toLowerCase()
  ) {
    score = Math.min(1.0, score + 0.10);
  }

  return score;
};

module.exports = {
  calculateMatchScore
};

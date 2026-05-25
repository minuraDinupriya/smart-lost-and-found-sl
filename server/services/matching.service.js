const stringSimilarity = require('string-similarity');

const calculateMatchScore = (lostItem, foundItem) => {
  // Hard constraints: Fail immediately if categories differ or if both are 'LOST'/'FOUND'
  if (lostItem.category !== foundItem.category || lostItem.type === foundItem.type) {
    return 0;
  }

  // Normalize and concatenate Title and Description for comprehensive NLP parsing
  const lostText = `${lostItem.title} ${lostItem.description}`.toLowerCase();
  const foundText = `${foundItem.title} ${foundItem.description}`.toLowerCase();

  // Compute text similarity using Dice's Coefficient (native local processing, 0 cost)
  const score = stringSimilarity.compareTwoStrings(lostText, foundText);

  // Return the score. Any score > 0.75 in the controller triggers a "High Confidence Match" alert
  return score;
};

module.exports = {
  calculateMatchScore
};

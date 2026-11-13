const stringSimilarity = require('string-similarity');
const { findMatchCandidates, saveItem } = require('../../data-access/repositories/item.repository');
const { createMessage } = require('../../data-access/repositories/chat.repository');
const { calculateHammingDistance } = require('../../utils/imageHash');
const { emitGlobalNotification } = require('./socket.service');
const { identifyItemFromImage } = require('../../data-access/integrations/gemini-identification');

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
    score = Math.min(1.0, score + 0.15);
  }

  if (
    lostItem.model &&
    foundItem.model &&
    lostItem.model !== 'Could not identify' &&
    lostItem.model.toLowerCase() === foundItem.model.toLowerCase()
  ) {
    score = Math.min(1.0, score + 0.15);
  }

  return score;
};

/**
 * Download image from URL to a temporary file
 */
const downloadImageToTemp = async (url) => {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const fetch = require('node-fetch'); // Ensure fetch is available, Node 18+ has it globally but we use native

  const tempPath = path.join(os.tmpdir(), `temp_img_${Date.now()}.jpg`);
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(tempPath, Buffer.from(buffer));
  return tempPath;
};

/**
 * Runs the AI matching engine for a given item against opposite-type items in the same category
 */
const runAutonomousMatching = async (savedItem) => {
  // Skip matching engine for Smart Tags
  if (savedItem.type === 'SMART_TAG') return;

  try {
    // If user skipped AI Identification, automatically enrich it in the background using Gemini!
    if (!savedItem.aiIdentified && savedItem.imageUrl) {
      try {
        const tempPath = await downloadImageToTemp(savedItem.imageUrl);
        const aiResult = await identifyItemFromImage(tempPath, 'image.jpg', 'image/jpeg');
        const fs = require('fs');
        fs.unlinkSync(tempPath);

        if (aiResult.success && aiResult.identification) {
          savedItem.aiIdentified = true;
          savedItem.aiIdentification = aiResult.identification;
          savedItem.brand = aiResult.identification.brand || savedItem.brand;
          savedItem.model = aiResult.identification.model || savedItem.model;
          savedItem.color = aiResult.identification.color || savedItem.color;
          // Re-save with enriched tags
          await saveItem(savedItem);
        }
      } catch (err) {
        console.error('Background AI enrichment failed:', err.message);
      }
    }

    const oppositeType = savedItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const potentialMatches = await findMatchCandidates(oppositeType, savedItem.category);

    for (const match of potentialMatches) {
      let isMatch = false;
      let matchPhase = ''; // 'VISUAL' or 'NLP'
      
      // 1. Evaluate Image Similarity
      if (savedItem.imageHash && match.imageHash) {
        const distance = calculateHammingDistance(savedItem.imageHash, match.imageHash);
        if (distance !== null && distance <= 10) {
          isMatch = true;
          matchPhase = 'VISUAL';
        }
      }
      
      // 2. Evaluate Text Similarity (incorporating AI tags and Brand/Model precision boosts)
      if (!isMatch) {
        const textScore = calculateMatchScore(savedItem, match);
        if (textScore >= 0.60) {
          isMatch = true;
          matchPhase = 'NLP';
        }
      }

      if (isMatch) {
        let alertMessage = '';
        if (matchPhase === 'VISUAL') {
          alertMessage = `🤖 AI VISUAL MATCH: Our Image Recognition engine detected a structural match between your photos! Click here to view the potential match: /items/${savedItem._id}`;
        } else if (matchPhase === 'NLP' && savedItem.aiIdentified && match.aiIdentified) {
          alertMessage = `🤖 AI VISUAL MATCH: Our Gemini Vision AI analyzed the photos and identified highly matching objects! Click here to view the potential match: /items/${savedItem._id}`;
        } else {
          alertMessage = `🤖 AI NLP MATCH: Our Text Analysis engine detected highly similar keyword overlap between your descriptions! Click here to view the potential match: /items/${savedItem._id}`;
        }

        const msg = await createMessage({
          itemId: match._id,
          senderId: savedItem.createdBy,
          receiverId: match.createdBy,
          text: alertMessage
        });
        
        emitGlobalNotification(match.createdBy, msg);
        emitGlobalNotification(savedItem.createdBy, msg);
      }
    }
  } catch (err) {
    console.error('Error during autonomous matching:', err);
  }
};

module.exports = {
  calculateMatchScore,
  runAutonomousMatching
};

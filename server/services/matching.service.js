const stringSimilarity = require('string-similarity');
const Item = require('../models/Item');
const Message = require('../models/Message');
const { calculateHammingDistance } = require('../utils/imageHash');
const { emitGlobalNotification } = require('../services/socket.service');
const { identifyItemFromImage } = require('../services/itemIdentification.service');

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
      console.log(`🧠 [BACKGROUND AI] - Item ${savedItem._id} lacks AI tags. Running auto-enrichment...`);
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
          await savedItem.save();
          console.log(`🧠 [BACKGROUND AI] - Success! Extracted: ${savedItem.brand} ${savedItem.model}`);
        }
      } catch (err) {
        console.error('Background AI enrichment failed:', err.message);
      }
    }

    const oppositeType = savedItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const potentialMatches = await Item.find({
      type: oppositeType,
      category: savedItem.category
    });

    console.log(`\n=========================================================`);
    console.log(`🧠 [AI MATCHING ENGINE] - STARTING ANALYSIS...`);
    console.log(`=========================================================`);
    console.log(`Target Item: "${savedItem.title}" (${savedItem.type})`);
    console.log(`Scanning against: ${potentialMatches.length} ${oppositeType} items...\n`);

    for (const match of potentialMatches) {
      // PREVENT SELF-MATCHING
      // TEMPORARILY DISABLED FOR TESTING PURPOSES
      /*
      if (savedItem.createdBy.toString() === match.createdBy.toString()) {
        console.log(`-> Skipping "${match.title}": Created by the same user.\n`);
        continue;
      }
      */

      let isMatch = false;
      let matchReason = '';
      let matchPhase = ''; // 'VISUAL' or 'NLP'

      console.log(`[Phase 1] 📷 Image Perceptual Hashing (pHash) Algorithm:`);
      console.log(`-> Comparing Bitwise Hamming Distance against: "${match.title}"`);
      
      // 1. Evaluate Image Similarity
      if (savedItem.imageHash && match.imageHash) {
        const distance = calculateHammingDistance(savedItem.imageHash, match.imageHash);
        if (distance !== null && distance <= 10) {
          isMatch = true;
          matchReason = `Visual Match (Distance: ${distance})`;
          matchPhase = 'VISUAL';
          console.log(`-> Result: Distance = ${distance} (Threshold: <= 10) - 🟢 VISUAL MATCH FOUND!\n`);
        } else {
          console.log(`-> Result: Distance = ${distance} (Threshold: <= 10) - NO VISUAL MATCH\n`);
        }
      } else {
         console.log(`-> Result: SKIPPED (Missing Image Data)\n`);
      }

      console.log(`[Phase 2] 📝 Natural Language Processing (NLP) Engine:`);
      console.log(`-> Algorithm: Dice's Coefficient (String Similarity)`);
      
      // 2. Evaluate Text Similarity (incorporating AI tags and Brand/Model precision boosts)
      if (!isMatch) {
        const textScore = calculateMatchScore(savedItem, match);
        if (textScore >= 0.60) {
          isMatch = true;
          matchReason = `Text Similarity Match (Score: ${(textScore * 100).toFixed(1)}%)`;
          matchPhase = 'NLP';
          console.log(`-> Result: Score = ${(textScore * 100).toFixed(1)}% (Threshold: >= 60%) - 🟢 NLP MATCH FOUND!\n`);
        } else {
          console.log(`-> Result: Score = ${(textScore * 100).toFixed(1)}% (Threshold: >= 60%) - NO MATCH\n`);
        }
      } else {
        console.log(`-> Result: SKIPPED (Visual Match already confirmed)\n`);
      }

      if (isMatch) {
        console.log(`🚨 SMART MATCH CONFIRMED!`);
        console.log(`-> Triggering Global Inboxes...`);
        console.log(`=========================================================\n`);

        let alertMessage = '';
        if (matchPhase === 'VISUAL') {
          alertMessage = `🤖 AI VISUAL MATCH: Our Image Recognition engine detected a structural match between your photos! Click here to view the potential match: /items/${savedItem._id}`;
        } else if (matchPhase === 'NLP' && savedItem.aiIdentified && match.aiIdentified) {
          alertMessage = `🤖 AI VISUAL MATCH: Our Gemini Vision AI analyzed the photos and identified highly matching objects! Click here to view the potential match: /items/${savedItem._id}`;
        } else {
          alertMessage = `🤖 AI NLP MATCH: Our Text Analysis engine detected highly similar keyword overlap between your descriptions! Click here to view the potential match: /items/${savedItem._id}`;
        }

        const msg = await Message.create({
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

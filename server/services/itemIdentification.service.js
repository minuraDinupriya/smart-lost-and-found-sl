const fs = require('fs');
const path = require('path');

/**
 * Valid system categories expected by the Item model
 */
const SYSTEM_CATEGORIES = [
  'Electronics',
  'Documents',
  'Keys',
  'Bags',
  'Wallets',
  'Pets',
  'Others'
];

/**
 * Normalizes category to match system schema
 */
const normalizeCategory = (catStr) => {
  if (!catStr) return 'Others';
  const matched = SYSTEM_CATEGORIES.find(
    (c) => c.toLowerCase() === catStr.toLowerCase()
  );
  return matched || 'Others';
};

/**
 * Helper to ensure confidence values are numbers between 0 and 1
 */
const sanitizeConfidence = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return null;
  return Math.min(Math.max(val, 0), 1);
};

/**
 * Perform local fallback image heuristic analysis when external AI is unconfigured or offline
 */
const performFallbackIdentification = (filename = '') => {
  const lowerName = filename.toLowerCase();
  let category = 'Others';
  let itemName = 'Item';
  let color = 'Could not identify';
  let brand = 'Could not identify';
  let model = 'Could not identify';
  let categoryConfidence = 0.75;
  let itemNameConfidence = 0.70;
  let colorConfidence = null;
  let brandConfidence = null;
  let modelConfidence = null;

  if (lowerName.includes('phone') || lowerName.includes('iphone') || lowerName.includes('samsung')) {
    category = 'Electronics';
    itemName = 'Mobile Phone';
    brand = lowerName.includes('iphone') ? 'Apple' : lowerName.includes('samsung') ? 'Samsung' : 'Smartphone Brand';
    brandConfidence = 0.82;
  } else if (lowerName.includes('bag') || lowerName.includes('backpack') || lowerName.includes('wallet')) {
    category = lowerName.includes('wallet') ? 'Wallets' : 'Bags';
    itemName = lowerName.includes('wallet') ? 'Wallet' : 'Backpack';
  } else if (lowerName.includes('key')) {
    category = 'Keys';
    itemName = 'Key Set';
  } else if (lowerName.includes('card') || lowerName.includes('nic') || lowerName.includes('passport')) {
    category = 'Documents';
    itemName = 'Identity / Official Document';
  }

  const description = `${color !== 'Could not identify' ? color : 'Item'} ${itemName} (${category}) uploaded for identification.`;

  return {
    category,
    categoryConfidence,
    itemName,
    itemNameConfidence,
    color,
    colorConfidence,
    brand,
    brandConfidence,
    model,
    modelConfidence,
    description
  };
};

/**
 * Analyze an uploaded item image using configured AI Vision provider (or graceful fallback)
 * @param {string} filePath - Absolute path to local temporary image file
 * @param {string} originalFilename - Original filename uploaded by user
 * @param {string} mimeType - File MIME type (e.g. image/jpeg, image/png)
 */
const identifyItemFromImage = async (filePath, originalFilename = '', mimeType = 'image/jpeg') => {
  const apiKey = process.env.ITEM_IDENTIFICATION_API_KEY || process.env.GEMINI_API_KEY;

  // Fallback if no API key is set
  if (!apiKey || apiKey === 'your_ai_vision_api_key_here' || apiKey === 'your_gemini_api_key_here') {
    console.log('[AI Service] No valid ITEM_IDENTIFICATION_API_KEY found. Utilizing graceful heuristic fallback.');
    return {
      success: true,
      provider: 'fallback',
      identification: performFallbackIdentification(originalFilename)
    };
  }

  try {
    // Read image binary and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const promptText = `
You are an expert AI visual recognition system for a Lost & Found platform.
Analyze the provided image of an item and return ONLY a single raw JSON object with NO markdown, NO backticks, and NO extra text.

The JSON object MUST adhere to this exact format:
{
  "category": "One of: Electronics, Documents, Keys, Bags, Wallets, Pets, Others",
  "categoryConfidence": 0.95,
  "itemName": "Specific item type/title (e.g. Smartphone, Leather Wallet, Key Ring)",
  "itemNameConfidence": 0.92,
  "color": "Primary visible color or 'Could not identify'",
  "colorConfidence": 0.88,
  "brand": "Brand name if visible (e.g. Samsung, Apple, Nike) or 'Could not identify'",
  "brandConfidence": 0.84,
  "model": "Specific model if confidently identifiable (e.g. Galaxy S21, MacBook Pro) or 'Could not identify'",
  "modelConfidence": 0.65,
  "description": "A clear, 1-2 sentence description of the item including visible characteristics."
}

Rules:
- Confidence scores MUST be numbers between 0.00 and 1.00.
- If a detail (color, brand, model) cannot be identified with reasonable confidence, set its value to "Could not identify" and its confidence score to null.
- Do NOT invent or fabricate information.
    `;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Service API Error ${response.status}]:`, errText);
      return {
        success: true,
        provider: 'fallback_error',
        identification: performFallbackIdentification(originalFilename)
      };
    }

    const resData = await response.json();
    const rawContent = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown syntax ```json ... ``` if returned by AI model
    const cleanedText = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      success: true,
      provider: 'gemini-vision',
      identification: {
        category: normalizeCategory(parsed.category),
        categoryConfidence: sanitizeConfidence(parsed.categoryConfidence) ?? 0.85,
        itemName: parsed.itemName || 'Identified Item',
        itemNameConfidence: sanitizeConfidence(parsed.itemNameConfidence) ?? 0.80,
        color: parsed.color || 'Could not identify',
        colorConfidence: parsed.color === 'Could not identify' ? null : sanitizeConfidence(parsed.colorConfidence),
        brand: parsed.brand || 'Could not identify',
        brandConfidence: parsed.brand === 'Could not identify' ? null : sanitizeConfidence(parsed.brandConfidence),
        model: parsed.model || 'Could not identify',
        modelConfidence: parsed.model === 'Could not identify' ? null : sanitizeConfidence(parsed.modelConfidence),
        description: parsed.description || `${parsed.itemName || 'Item'} detected from image.`
      }
    };
  } catch (error) {
    console.error('[AI Service Processing Exception]:', error.message);
    // Graceful degradation: Return fallback identification on exception
    return {
      success: true,
      provider: 'fallback_exception',
      identification: performFallbackIdentification(originalFilename)
    };
  }
};

module.exports = {
  identifyItemFromImage,
  SYSTEM_CATEGORIES
};

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
  const catLower = catStr.toLowerCase();
  
  // Direct matching
  const matched = SYSTEM_CATEGORIES.find(
    (c) => c.toLowerCase() === catLower
  );
  if (matched) return matched;

  // Keyword mapping for common categories
  if (catLower.includes('phone') || catLower.includes('laptop') || catLower.includes('gadget') || catLower.includes('device') || catLower.includes('electronic') || catLower.includes('headphone') || catLower.includes('camera')) {
    return 'Electronics';
  }
  if (catLower.includes('card') || catLower.includes('license') || catLower.includes('nic') || catLower.includes('passport') || catLower.includes('paper') || catLower.includes('doc') || catLower.includes('book') || catLower.includes('stationery') || catLower.includes('pencil') || catLower.includes('pen')) {
    return 'Documents';
  }
  if (catLower.includes('key')) {
    return 'Keys';
  }
  if (catLower.includes('bag') || catLower.includes('backpack') || catLower.includes('luggage') || catLower.includes('suitcase') || catLower.includes('pouch')) {
    return 'Bags';
  }
  if (catLower.includes('wallet') || catLower.includes('purse')) {
    return 'Wallets';
  }
  if (catLower.includes('dog') || catLower.includes('cat') || catLower.includes('pet') || catLower.includes('animal')) {
    return 'Pets';
  }

  return 'Others';
};

/**
 * Helper to ensure confidence values are numbers between 0 and 1
 */
const sanitizeConfidence = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return null;
  return Math.min(Math.max(val, 0), 1);
};

/**
 * Analyze an uploaded item image using configured AI Vision provider
 * @param {string} filePath - Absolute path to local temporary image file
 * @param {string} originalFilename - Original filename uploaded by user
 * @param {string} mimeType - File MIME type (e.g. image/jpeg, image/png)
 */
const identifyItemFromImage = async (filePath, originalFilename = '', mimeType = 'image/jpeg') => {
  const apiKey = process.env.ITEM_IDENTIFICATION_API_KEY || process.env.GEMINI_API_KEY;

  // If no valid API key is set, explicitly return failure instead of fake dummy values
  if (!apiKey || apiKey === 'your_ai_vision_api_key_here' || apiKey === 'your_gemini_api_key_here') {
    console.warn('[AI Service] No valid ITEM_IDENTIFICATION_API_KEY or GEMINI_API_KEY found in process.env.');
    return {
      success: false,
      message: 'AI identification service is not configured (missing API key). Please configure GEMINI_API_KEY in server/.env or enter item details manually.'
    };
  }

  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      message: 'Uploaded image file not found on server.'
    };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const imageMimeType = mimeType || 'image/jpeg';

    const promptText = `
You are an expert AI visual recognition system for a Lost & Found platform.
Analyze the provided image of an item thoroughly. Return ONLY a single raw JSON object with NO markdown, NO backtick code fences, and NO additional text.

The JSON object MUST strictly follow this exact format:
{
  "category": "One of: Electronics, Documents, Keys, Bags, Wallets, Pets, Others",
  "categoryConfidence": 0.95,
  "itemName": "Specific item type/title (e.g. Pencil, Smartphone, Leather Wallet, Key Ring, Water Bottle)",
  "itemNameConfidence": 0.92,
  "color": "Primary visible color (e.g. Orange, Black, Blue, Red, Silver) or 'Could not identify'",
  "colorConfidence": 0.88,
  "brand": "Brand name if visible (e.g. Faber-Castell, Samsung, Apple, Nike) or 'Could not identify'",
  "brandConfidence": 0.84,
  "model": "Specific model if confidently identifiable (e.g. HB #2, Galaxy S21, MacBook Pro) or 'Could not identify'",
  "modelConfidence": 0.65,
  "description": "A detailed 1-2 sentence description of ONLY the item itself, including visible colors, shape, markings, and condition. DO NOT describe the background, environment, or the surface the item is resting on."
}

Rules:
- Confidence scores MUST be numbers between 0.00 and 1.00.
- Analyze the ACTUAL image provided. Do NOT return generic placeholder text.
- If a detail (color, brand, model) cannot be identified from the image, set its value to "Could not identify" and its confidence score to null.
- Do NOT invent or fabricate details not visible in the image.
- CRITICAL: Describe ONLY the object. Completely ignore and do not mention the background, environment, hands holding the object, tables, outdoors, etc.
    `;

    // Hardcode the fastest, most reliable vision model to prevent unnecessary HTTP round-trips
    let modelNames = ['gemini-1.5-flash'];

    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent([
          promptText,
          {
            inlineData: {
              data: base64Data,
              mimeType: imageMimeType
            }
          }
        ]);

        const response = await result.response;
        const rawContent = response.text();

        if (rawContent) {
          const cleanedText = rawContent
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          
          const parsed = JSON.parse(cleanedText);

          const finalCategory = normalizeCategory(parsed.category);
          const finalItemName = parsed.itemName || 'Identified Item';
          const finalColor = parsed.color || 'Could not identify';
          const finalBrand = parsed.brand || 'Could not identify';
          const finalModel = parsed.model || 'Could not identify';

          // Clean description formatting to eliminate any duplicate words
          let finalDescription = parsed.description || '';
          if (!finalDescription || finalDescription.includes('Item Item')) {
            const descColor = finalColor !== 'Could not identify' ? finalColor : '';
            const descTitle = finalItemName !== 'Item' ? finalItemName : finalCategory;
            finalDescription = `${descColor} ${descTitle} (${finalCategory}) identified from uploaded image.`.replace(/\s+/g, ' ').trim();
          }

          console.log(`[AI Service] Successfully identified item using model ${modelName}:`, finalItemName);

          return {
            success: true,
            provider: `gemini-vision (${modelName})`,
            identification: {
              category: finalCategory,
              categoryConfidence: sanitizeConfidence(parsed.categoryConfidence) ?? 0.90,
              itemName: finalItemName,
              itemNameConfidence: sanitizeConfidence(parsed.itemNameConfidence) ?? 0.88,
              color: finalColor,
              colorConfidence: finalColor === 'Could not identify' ? null : (sanitizeConfidence(parsed.colorConfidence) ?? 0.85),
              brand: finalBrand,
              brandConfidence: finalBrand === 'Could not identify' ? null : (sanitizeConfidence(parsed.brandConfidence) ?? 0.80),
              model: finalModel,
              modelConfidence: finalModel === 'Could not identify' ? null : (sanitizeConfidence(parsed.modelConfidence) ?? 0.70),
              description: finalDescription
            }
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AI Service] Model ${modelName} failed:`, err.message);
      }
    }

    // Strategy 2: Direct REST fetch fallback if SDK calls failed
    for (const modelName of modelNames) {
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const restRes = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: imageMimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        });

        if (restRes.ok) {
          const resData = await restRes.json();
          const rawContent = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawContent) {
            const cleanedText = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedText);

            const finalCategory = normalizeCategory(parsed.category);
            const finalItemName = parsed.itemName || 'Identified Item';
            const finalColor = parsed.color || 'Could not identify';

            return {
              success: true,
              provider: 'gemini-vision-rest',
              identification: {
                category: finalCategory,
                categoryConfidence: sanitizeConfidence(parsed.categoryConfidence) ?? 0.90,
                itemName: finalItemName,
                itemNameConfidence: sanitizeConfidence(parsed.itemNameConfidence) ?? 0.88,
                color: finalColor,
                colorConfidence: finalColor === 'Could not identify' ? null : (sanitizeConfidence(parsed.colorConfidence) ?? 0.85),
                brand: parsed.brand || 'Could not identify',
                brandConfidence: parsed.brand === 'Could not identify' ? null : (sanitizeConfidence(parsed.brandConfidence) ?? 0.80),
                model: parsed.model || 'Could not identify',
                modelConfidence: parsed.model === 'Could not identify' ? null : (sanitizeConfidence(parsed.modelConfidence) ?? 0.70),
                description: parsed.description || `${finalColor !== 'Could not identify' ? finalColor : ''} ${finalItemName} identified from image.`.trim()
              }
            };
          }
        }
      } catch (restErr) {
        console.warn(`[AI Service] REST fallback failed for ${modelName}:`, restErr.message);
      }
    }

    console.error('[AI Service] All AI Vision attempts failed:', lastError?.message);

    // Return explicit error response instead of fake dummy values
    return {
      success: false,
      message: `AI Vision analysis failed: ${lastError?.message || 'Unable to connect to AI provider'}. Please fill in item details manually.`
    };
  } catch (error) {
    console.error('[AI Service Exception]:', error.message);
    return {
      success: false,
      message: `AI identification error: ${error.message}. Please fill in item details manually.`
    };
  }
};

module.exports = {
  identifyItemFromImage,
  SYSTEM_CATEGORIES
};

const fs = require('fs');

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
 * Analyze an uploaded audio report using Gemini 1.5 Flash multimodal API
 * @param {string} filePath - Absolute path to local temporary audio file
 * @param {string} mimeType - File MIME type (e.g. audio/webm, audio/mp3)
 */
const analyzeVoiceReport = async (filePath, mimeType = 'audio/webm') => {
  const apiKey = process.env.ITEM_IDENTIFICATION_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_ai_vision_api_key_here' || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured for voice reporting.');
  }

  try {
    // Read audio binary and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const promptText = `
You are an expert AI assistant for a Lost & Found platform. Your task is to listen to the provided audio report (which could be in English, Sinhala, or a mix of both) and extract key information.

Return ONLY a single raw JSON object with NO markdown, NO backticks, and NO extra text. Do NOT invent missing information. If something is not mentioned, use null for strings.

The JSON object MUST adhere to this exact format:
{
  "transcript": "The full recognized text of what the user said in their original language",
  "language": "en" or "si" or "mixed",
  "extractedData": {
    "itemName": "Specific item type/title (e.g. Smartphone, Leather Wallet, Key Ring)",
    "category": "One of: Electronics, Documents, Keys, Bags, Wallets, Pets, Others",
    "color": "Primary visible color or null if not mentioned",
    "brand": "Brand name if visible (e.g. Samsung, Apple, Nike) or null if not mentioned",
    "model": "Specific model if identifiable or null if not mentioned",
    "location": "Location where it was lost or found (e.g. University Library, Bus Stand) or null if not mentioned",
    "type": "LOST or FOUND (infer from context, if they lost it = LOST, if they found it = FOUND)",
    "description": "A clear, 1-2 sentence description of the item and event."
  }
}
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
                  mime_type: mimeType,
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
      console.error(`[Voice Service API Error ${response.status}]:`, errText);
      throw new Error('Failed to analyze voice report from AI provider.');
    }

    const resData = await response.json();
    const rawContent = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown syntax ```json ... ``` if returned by AI model
    const cleanedText = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      success: true,
      transcript: parsed.transcript || "No transcript generated.",
      language: parsed.language || "unknown",
      extractedData: {
        itemName: parsed.extractedData?.itemName || '',
        category: normalizeCategory(parsed.extractedData?.category),
        color: parsed.extractedData?.color || '',
        brand: parsed.extractedData?.brand || '',
        model: parsed.extractedData?.model || '',
        location: parsed.extractedData?.location || '',
        type: parsed.extractedData?.type === 'FOUND' ? 'FOUND' : 'LOST',
        description: parsed.extractedData?.description || ''
      }
    };
  } catch (error) {
    console.error('[Voice Service Processing Exception]:', error.message);
    throw error;
  }
};

module.exports = {
  analyzeVoiceReport
};

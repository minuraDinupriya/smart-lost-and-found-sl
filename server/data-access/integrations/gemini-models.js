const listIdentificationModels = async () => {
  const apiKey = process.env.ITEM_IDENTIFICATION_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'No API key' };

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!response.ok) return { error: 'Unable to list AI models' };
  return response.json();
};

module.exports = { listIdentificationModels };

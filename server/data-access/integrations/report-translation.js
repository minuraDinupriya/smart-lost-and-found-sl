const translate = require('google-translate-api-x');

const translateReport = async ({ title, description }) => {
  const translations = {};
  try {
    if (title) {
      translations.titleSi = (await translate(title, { to: 'si' })).text;
      translations.titleTa = (await translate(title, { to: 'ta' })).text;
    }
    if (description) {
      translations.descriptionSi = (await translate(description, { to: 'si' })).text;
      translations.descriptionTa = (await translate(description, { to: 'ta' })).text;
    }
  } catch (error) {
    console.error('Report translation failed:', error);
  }
  return translations;
};

module.exports = { translateReport };

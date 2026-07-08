const cron = require('node-cron');
const { archiveExpiredItems } = require('./archive.service');

/**
 * Schedules the daily Item Expiry & Auto Archive job.
 * Runs once every day at midnight (server time), turning any "active"
 * item whose expiresAt has passed into "archived".
 */
const startArchiveCron = () => {
  // "0 0 * * *" => At 00:00 (midnight) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('[Auto Archive] Running scheduled midnight archive check...');
    await archiveExpiredItems();
  });

  console.log('[Auto Archive] Daily midnight archive cron job scheduled.');
};

module.exports = { startArchiveCron };

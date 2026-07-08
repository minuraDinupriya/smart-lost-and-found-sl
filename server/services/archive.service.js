const Item = require('../models/Item');

/**
 * Item Expiry & Auto Archive Feature
 * Scans for items that are still "active" but whose expiresAt date has
 * passed, and flips their archiveStatus to "archived".
 *
 * This does NOT touch the existing "status" field (Available/Claimed/etc),
 * so claiming, police resolution, and TrustScore logic are unaffected.
 */
const archiveExpiredItems = async () => {
  try {
    const result = await Item.updateMany(
      {
        archiveStatus: 'active',
        expiresAt: { $lte: new Date() },
        type: { $ne: 'SMART_TAG' }, // Smart Tags are permanent registrations, not expiring reports
      },
      { $set: { archiveStatus: 'archived' } }
    );

    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;

    if (modified > 0) {
      console.log(`[Auto Archive] Archived ${modified}/${matched} expired item(s).`);
    }

    return { matched, modified };
  } catch (error) {
    console.error('[Auto Archive] Failed to archive expired items:', error);
    throw error;
  }
};

module.exports = { archiveExpiredItems };

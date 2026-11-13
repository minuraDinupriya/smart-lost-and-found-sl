const hotspotService = require('../../business/services/hotspot.service');

const getHotspots = async (req, res) => {
  try {
    const { period, category } = req.query;
    if ([period, category].some(value => value !== undefined && typeof value !== 'string')) {
      return res.status(400).json({ success: false, message: 'Hotspot filters must be text.' });
    }
    const hotspots = await hotspotService.getHotspots({ period, category });
    return res.status(200).json({ success: true, hotspots });
  } catch (error) {
    console.error('Hotspot fetch error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching hotspots' });
  }
};

module.exports = { getHotspots };

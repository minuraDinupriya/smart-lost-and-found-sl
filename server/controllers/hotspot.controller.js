const Item = require('../models/Item');

// Helper to calculate distance in km between two lat/lng points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
};

const getHotspots = async (req, res) => {
  try {
    const { period, category } = req.query;

    const filter = {
      type: 'LOST',
      status: { $ne: 'Claimed' },
      archiveStatus: { $ne: 'archived' },
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (period && period !== 'All Time') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        filter.createdAt = { $gte: dateLimit };
      }
    }

    const lostItems = await Item.find(filter).lean();

    // Fetch found items for additional context
    const foundFilter = {
      type: 'FOUND',
      status: { $ne: 'Claimed' },
      archiveStatus: { $ne: 'archived' },
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    };
    
    if (category && category !== 'All') {
        foundFilter.category = category;
    }
    
    if (period && period !== 'All Time') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        foundFilter.createdAt = { $gte: dateLimit };
      }
    }
    
    const foundItems = await Item.find(foundFilter).lean();

    // Grouping nearby reports geographically
    const CLUSTER_RADIUS_KM = 3; // Configurable distance threshold in km
    const clusters = [];

    // Simple Greedy Clustering for LOST items
    for (const item of lostItems) {
      let addedToCluster = false;
      for (const cluster of clusters) {
        const distance = calculateDistance(item.latitude, item.longitude, cluster.latitude, cluster.longitude);
        if (distance <= CLUSTER_RADIUS_KM) {
          cluster.items.push(item);
          addedToCluster = true;
          
          // Re-calculate cluster center as average
          cluster.latitude = (cluster.latitude * (cluster.items.length - 1) + item.latitude) / cluster.items.length;
          cluster.longitude = (cluster.longitude * (cluster.items.length - 1) + item.longitude) / cluster.items.length;
          break;
        }
      }
      if (!addedToCluster) {
        clusters.push({
          latitude: item.latitude,
          longitude: item.longitude,
          items: [item],
          foundItems: []
        });
      }
    }
    
    // Assign FOUND items to existing hotspots if they fall within radius
    for (const foundItem of foundItems) {
      for (const cluster of clusters) {
        const distance = calculateDistance(foundItem.latitude, foundItem.longitude, cluster.latitude, cluster.longitude);
        if (distance <= CLUSTER_RADIUS_KM) {
           cluster.foundItems.push(foundItem);
           break; // Assign to closest/first cluster it matches
        }
      }
    }

    const hotspots = clusters
      .filter(cluster => cluster.items.length >= 1) // Minimum 1 report to be a hotspot (lowered for demonstration)
      .map(cluster => {
        const lostCount = cluster.items.length;
        const foundCount = cluster.foundItems.length;
        const totalCount = lostCount + foundCount;
        
        // Category breakdown
        const categoryCounts = {};
        [...cluster.items, ...cluster.foundItems].forEach(i => {
           categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
        });
        
        let mostCommonCategory = 'Unknown';
        let maxCount = 0;
        const categoriesList = [];
        for (const [cat, count] of Object.entries(categoryCounts)) {
          categoriesList.push({ category: cat, count });
          if (count > maxCount) {
             maxCount = count;
             mostCommonCategory = cat;
          }
        }
        
        categoriesList.sort((a,b) => b.count - a.count);

        let activityLevel = 'Low';
        if (totalCount >= 15) activityLevel = 'High';
        else if (totalCount >= 10) activityLevel = 'Medium-High';
        else if (totalCount >= 5) activityLevel = 'Medium';

        return {
          latitude: cluster.latitude,
          longitude: cluster.longitude,
          reportCount: totalCount,
          lostCount,
          foundCount,
          activityLevel,
          mostCommonCategory,
          categories: categoriesList
        };
      });

    res.status(200).json({ success: true, hotspots });
  } catch (error) {
    console.error('Hotspot fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching hotspots' });
  }
};

module.exports = {
  getHotspots
};

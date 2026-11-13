const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const findNearbyPolice = async (latitude, longitude) => {
  const query = `[out:json];nwr["amenity"="police"](around:15000,${latitude},${longitude});out center;`;
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LostAndFoundApp/1.0 Node.js',
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (response.ok) return await response.json();
      console.error(`Overpass API error at ${url}:`, response.status);
    } catch (error) {
      console.error(`Overpass request failed at ${url}:`, error.message);
    }
  }
  return null;
};

module.exports = { findNearbyPolice };

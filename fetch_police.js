const fs = require('fs');
const path = require('path');

const query = '[out:json][timeout:25];nwr["amenity"="police"](5.8,79.5,9.9,82.0);out center;';
const url = 'https://overpass-api.de/api/interpreter';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'LostAndFoundApp/1.0 Node.js'
  },
  body: `data=${encodeURIComponent(query)}`
}).then(async res => {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    const stations = data.elements.map(el => ({
      id: el.id,
      name: el.tags?.name || el.tags?.['name:en'] || "Police Station",
      lat: el.lat || (el.center && el.center.lat),
      lon: el.lon || (el.center && el.center.lon)
    })).filter(s => s.lat && s.lon);
    
    const dir = path.join(__dirname, 'client', 'src', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(path.join(dir, 'policeStations.json'), JSON.stringify(stations, null, 2));
    console.log(`Saved ${stations.length} police stations!`);
  } catch (e) {
    console.error("Failed to parse JSON. Server response:", text);
  }
}).catch(console.error);

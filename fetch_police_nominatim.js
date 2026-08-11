const fs = require('fs');
const path = require('path');

const url = 'https://nominatim.openstreetmap.org/search?country=sri%20lanka&amenity=police&format=json&limit=10000';

fetch(url, {
  headers: {
    'User-Agent': 'LostAndFoundApp/1.0 Node.js'
  }
}).then(async res => {
  const data = await res.json();
  const stations = data.map(el => ({
    id: el.osm_id,
    name: el.name || "Police Station",
    lat: parseFloat(el.lat),
    lon: parseFloat(el.lon)
  }));
  
  const dir = path.join(__dirname, 'client', 'src', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path.join(dir, 'policeStations.json'), JSON.stringify(stations, null, 2));
  console.log(`Saved ${stations.length} police stations!`);
}).catch(console.error);

const query = '[out:json];nwr["amenity"="police"](around:15000,6.93,79.88);out center;';
const url = `https://overpass-api.de/api/interpreter`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'LostAndFoundApp/1.0 Node.js'
  },
  body: `data=${encodeURIComponent(query)}`
}).then(async r => {
  console.log("Status:", r.status);
  const text = await r.text();
  console.log("Body:", text);
}).catch(console.error);

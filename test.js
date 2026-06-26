
async function test() {
  const query = `
    [out:json];
    nwr["amenity"="police"](around:15000,undefined,undefined);
    out center;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LostAndFoundApp/1.0',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      console.error("HTTP Error:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("Found:", data.elements?.length);
    if (data.elements?.length > 0) {
      data.elements.forEach(el => {
        console.log(`Type: ${el.type}, ID: ${el.id}, Lat: ${el.lat || el.center?.lat}, Lon: ${el.lon || el.center?.lon}`);
      });
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();

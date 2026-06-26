
async function test() {
  const query = `
    [out:json];
    nwr["amenity"="police"](around:15000,undefined,undefined);
    out center;
  `;
  const url = `https://nominatim.openstreetmap.org/search?format=json&amenity=police&lat=6.9271&lon=79.8612&radius=15000`;
  console.log("Testing:", url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LostAndFoundApp/1.0'
      }
    });
    if (!res.ok) {
      console.error("HTTP Error:", res.status);
    } else {
      const data = await res.json();
      console.log("Success! Found elements:", data?.length);
      if (data?.length > 0) {
        console.log("First:", data[0].name, data[0].lat, data[0].lon);
      }
    }
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}
test();

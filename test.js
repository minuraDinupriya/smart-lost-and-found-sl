
async function test() {
  const query = `
    [out:json];
    nwr["amenity"="police"](around:15000,7.214,79.845); // Negombo coordinates
    out center;
  `;
  const url = `https://overpass-api.de/api/interpreter`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });
    if (!res.ok) {
      console.error("HTTP Error:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("Found:", data.elements?.length);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();

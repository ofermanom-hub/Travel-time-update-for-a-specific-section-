export async function fetchOsrmRoute(a, b) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

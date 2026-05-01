// In production this data would come from OSRM / OpenStreetMap routing APIs.
// avgSpeedKmh = 25 is a typical NYC driving speed used for travel-time estimation.

const AVG_SPEED_KMH = 25;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Bounding box covers Manhattan + Brooklyn
const LAT_MIN = 40.68;
const LAT_MAX = 40.82;
const LNG_MIN = -74.02;
const LNG_MAX = -73.93;

const seed = [];
let idCounter = 1;

// Use a fixed-seed-like approach: just generate deterministically enough records
// by seeding with a stable sequence (Math.random is fine for demo data)
for (let i = 0; i < 300; i++) {
  const originLat = randomInRange(LAT_MIN, LAT_MAX);
  const originLng = randomInRange(LNG_MIN, LNG_MAX);
  const destLat = randomInRange(LAT_MIN, LAT_MAX);
  const destLng = randomInRange(LNG_MIN, LNG_MAX);
  const distanceKm = haversineKm(originLat, originLng, destLat, destLng);
  const travelTimeMin = (distanceKm / AVG_SPEED_KMH) * 60;

  seed.push({
    id: idCounter++,
    originLat,
    originLng,
    destLat,
    destLng,
    distanceKm,
    travelTimeMin,
  });
}

export default seed;

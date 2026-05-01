import routeGeometries from './routeGeometries.json';

const AVG_SPEED_KMH = 25;

// Mulberry32 seeded PRNG — deterministic across every page load
function mulberry32(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function toRad(deg) { return (deg * Math.PI) / 180; }

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
  return rand() * (max - min) + min;
}

const LAT_MIN = 40.68;
const LAT_MAX = 40.82;
const LNG_MIN = -74.02;
const LNG_MAX = -73.93;

// Build a lookup from pre-generated OSRM geometries (id → entry)
const geoMap = new Map(routeGeometries.map(g => [g.id, g]));

const seed = [];
let idCounter = 1;

for (let i = 0; i < 300; i++) {
  const originLat = randomInRange(LAT_MIN, LAT_MAX);
  const originLng = randomInRange(LNG_MIN, LNG_MAX);
  const destLat   = randomInRange(LAT_MIN, LAT_MAX);
  const destLng   = randomInRange(LNG_MIN, LNG_MAX);

  const id  = idCounter++;
  const geo = geoMap.get(id);

  seed.push({
    id,
    originLat,
    originLng,
    destLat,
    destLng,
    distanceKm:    geo?.distanceKm    ?? haversineKm(originLat, originLng, destLat, destLng),
    travelTimeMin: geo?.travelTimeMin ?? (haversineKm(originLat, originLng, destLat, destLng) / AVG_SPEED_KMH * 60),
    geometry:      geo?.geometry      ?? [[originLat, originLng], [destLat, destLng]],
  });
}

export default seed;

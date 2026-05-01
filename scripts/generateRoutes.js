// Run once: npm run generate-routes
// Fetches OSRM road-following routes for all 300 seed records and writes
// src/data/routeGeometries.json. Commit that file so the app never fetches at
// build time. Rate-limited to 150ms between requests (~45s total).

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../src/data/routeGeometries.json');
const DELAY_MS = 150;

// Inline the same deterministic seed generation used in seedTravelTimes.js
// (mulberry32, seed=42, same call order) so we don't have to import the module.
function mulberry32(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const LAT_MIN = 40.68, LAT_MAX = 40.82, LNG_MIN = -74.02, LNG_MAX = -73.93;
const r = (min, max) => rand() * (max - min) + min;

const seed = Array.from({ length: 300 }, (_, i) => {
  const originLat = r(LAT_MIN, LAT_MAX);
  const originLng = r(LNG_MIN, LNG_MAX);
  const destLat   = r(LAT_MIN, LAT_MAX);
  const destLng   = r(LNG_MIN, LNG_MAX);
  return { id: i + 1, originLat, originLng, destLat, destLng };
});

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function fetchRoute({ id, originLat, originLng, destLat, destLng }) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      console.warn(`  ✗ id=${id} OSRM code: ${data.code}`);
      return fallback(id, originLat, originLng, destLat, destLng);
    }
    const route = data.routes[0];
    return {
      id,
      geometry:      route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm:    route.distance / 1000,
      travelTimeMin: route.duration / 60,
    };
  } catch (err) {
    console.warn(`  ✗ id=${id} fetch error: ${err.message}`);
    return fallback(id, originLat, originLng, destLat, destLng);
  }
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallback(id, oLat, oLng, dLat, dLng) {
  const distanceKm = haversine(oLat, oLng, dLat, dLng);
  return { id, geometry: [[oLat, oLng], [dLat, dLng]], distanceKm, travelTimeMin: distanceKm / 25 * 60 };
}

console.log(`Fetching OSRM routes for ${seed.length} records (${DELAY_MS}ms delay)…`);
const results = [];
for (let i = 0; i < seed.length; i++) {
  if (i > 0) await sleep(DELAY_MS);
  results.push(await fetchRoute(seed[i]));
  if ((i + 1) % 25 === 0 || i + 1 === seed.length)
    console.log(`  ${i + 1}/${seed.length}`);
}

writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
console.log(`Done → ${OUT_PATH}`);

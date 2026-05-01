import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Fix default marker icons broken by Vite asset hashing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Bounding box that matches seedTravelTimes.js (Manhattan + Brooklyn)
const DATA_BOUNDS = [[40.68, -74.02], [40.82, -73.93]];

function routeColor(travelTimeMin) {
  if (travelTimeMin < 10) return '#22c55e';
  if (travelTimeMin <= 25) return '#f59e0b';
  return '#ef4444';
}

// Manages the L.Draw.Polygon handler and syncs with the drawing state
function DrawControl({ dispatch, drawing, setDrawing, drawHandlerRef, setVertexCount, clearDrawnRef }) {
  const map = useMap();
  const drawnRef = useRef(null);
  const handlerRef = useRef(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;
    clearDrawnRef.current = () => drawnItems.clearLayers();

    const handler = new L.Draw.Polygon(map, {
      shapeOptions: { color: '#6366f1', weight: 2 },
      allowIntersection: false,
      showArea: false,
      snapDistance: 20,
    });
    handlerRef.current = handler;
    drawHandlerRef.current = handler;

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const geoJson = e.layer.toGeoJSON();
      setDrawing(false);
      dispatch({ type: 'SET_POLYGON', payload: geoJson });
      dispatch({ type: 'MUTATE_IN_POLYGON', payload: geoJson });
    });

    map.on('draw:drawvertex', () => setVertexCount((c) => c + 1));
    map.on('draw:drawstop', () => setVertexCount(0));

    return () => {
      handler.disable();
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED);
      map.off('draw:drawvertex');
      map.off('draw:drawstop');
      drawHandlerRef.current = null;
      clearDrawnRef.current = null;
    };
  }, [map, dispatch, setDrawing, drawHandlerRef, setVertexCount, clearDrawnRef]);

  useEffect(() => {
    const handler = handlerRef.current;
    if (!handler) return;
    drawing ? handler.enable() : handler.disable();
  }, [drawing]);

  return null;
}

function RouteClickHandler({ picking, dispatch }) {
  useMapEvents({
    click(e) {
      if (!picking) return;
      dispatch({ type: 'SET_ROUTE_POINT', payload: { lat: e.latlng.lat, lng: e.latlng.lng } });
    },
  });
  return null;
}

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapView({ records, routePoints, changedIds, picking, drawing, setDrawing, drawHandlerRef, setVertexCount, clearDrawnRef, dispatch }) {
  const changedSet = new Set(changedIds);

  return (
    <MapContainer
      center={[40.754, -73.974]}
      zoom={13}
      maxBounds={[[40.60, -74.12], [40.92, -73.75]]}
      maxBoundsViscosity={0.85}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Data coverage border */}
      <Rectangle
        bounds={DATA_BOUNDS}
        pathOptions={{ color: '#6366f1', weight: 2, dashArray: '6 5', fill: true, fillColor: '#6366f1', fillOpacity: 0.03 }}
      />

      {/* Route polylines — changed ones get a glow + thicker line */}
      {records.map((rec) => {
        const changed = changedSet.has(rec.id);
        const positions = [[rec.originLat, rec.originLng], [rec.destLat, rec.destLng]];
        const color = routeColor(rec.travelTimeMin);
        return changed ? (
          <Polyline key={rec.id} positions={positions}
            pathOptions={{ color: '#fff', weight: 7, opacity: 0.55 }}
          >
            <Polyline positions={positions}
              pathOptions={{ color, weight: 3.5, opacity: 1 }}
            />
          </Polyline>
        ) : (
          <Polyline key={rec.id} positions={positions}
            pathOptions={{ color, weight: 1.5, opacity: 0.6 }}
          />
        );
      })}

      {routePoints[0] && <Marker position={[routePoints[0].lat, routePoints[0].lng]} icon={startIcon} />}
      {routePoints[1] && <Marker position={[routePoints[1].lat, routePoints[1].lng]} icon={endIcon} />}

      <DrawControl dispatch={dispatch} drawing={drawing} setDrawing={setDrawing} drawHandlerRef={drawHandlerRef} setVertexCount={setVertexCount} clearDrawnRef={clearDrawnRef} />
      <RouteClickHandler picking={picking} dispatch={dispatch} />
    </MapContainer>
  );
}

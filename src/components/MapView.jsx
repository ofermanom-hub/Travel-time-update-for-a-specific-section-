import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet';
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

function routeColor(travelTimeMin) {
  if (travelTimeMin < 10) return '#22c55e';   // green
  if (travelTimeMin <= 25) return '#f59e0b';  // amber
  return '#ef4444';                            // red
}

// Manages the L.Draw.Polygon handler and syncs with the drawing state
function DrawControl({ dispatch, drawing, setDrawing, drawHandlerRef, setVertexCount, clearDrawnRef }) {
  const map = useMap();
  const drawnRef = useRef(null);
  const handlerRef = useRef(null);

  // Create handler and drawn-items layer once
  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;
    clearDrawnRef.current = () => drawnItems.clearLayers();

    // allowIntersection:false + snapDistance make it easy to snap-close on the first vertex
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

    // Track vertex count for undo/close button state
    map.on('draw:drawvertex', () => setVertexCount((c) => c + 1));
    // Reset count when drawing session ends (complete or cancel)
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

  // Sync drawing state → enable/disable handler
  useEffect(() => {
    const handler = handlerRef.current;
    if (!handler) return;
    if (drawing) {
      handler.enable();
    } else {
      handler.disable();
    }
  }, [drawing]);

  return null;
}

// Handles click-to-place route markers when picking mode is active
function RouteClickHandler({ picking, routePoints, dispatch }) {
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

export default function MapView({ records, routePoints, picking, drawing, setDrawing, drawHandlerRef, setVertexCount, clearDrawnRef, dispatch }) {
  return (
    <MapContainer
      center={[40.75, -73.98]}
      zoom={12}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {records.map((rec) => (
        <Polyline
          key={rec.id}
          positions={[
            [rec.originLat, rec.originLng],
            [rec.destLat, rec.destLng],
          ]}
          pathOptions={{ color: routeColor(rec.travelTimeMin), weight: 1.5, opacity: 0.7 }}
        />
      ))}

      {routePoints[0] && <Marker position={[routePoints[0].lat, routePoints[0].lng]} icon={startIcon} />}
      {routePoints[1] && <Marker position={[routePoints[1].lat, routePoints[1].lng]} icon={endIcon} />}

      <DrawControl dispatch={dispatch} drawing={drawing} setDrawing={setDrawing} drawHandlerRef={drawHandlerRef} setVertexCount={setVertexCount} clearDrawnRef={clearDrawnRef} />
      <RouteClickHandler picking={picking} routePoints={routePoints} dispatch={dispatch} />
    </MapContainer>
  );
}

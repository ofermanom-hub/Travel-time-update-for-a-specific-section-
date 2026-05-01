import { useReducer, useRef, useState, useEffect } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import seedData from './data/seedTravelTimes.js';
import { fetchOsrmRoute } from './utils/osrm.js';
import MapView from './components/MapView.jsx';
import Controls from './components/Controls.jsx';
import './App.css';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function geometryLengthKm(geometry) {
  let total = 0;
  for (let i = 1; i < geometry.length; i++) {
    const [lat1, lng1] = geometry[i - 1];
    const [lat2, lng2] = geometry[i];
    total += haversineKm(lat1, lng1, lat2, lng2);
  }
  return total;
}

const initialState = {
  originalRecords: seedData,
  records: seedData,
  selectedPolygon: null,
  routePoints: [],
  routeGeometry: null,
  routeLoading: false,
  lastCalculated: null,
  changedIds: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_POLYGON':
      return { ...state, selectedPolygon: action.payload };

    case 'MUTATE_IN_POLYGON': {
      const polygon = action.payload;
      const changedIds = [];
      const mutated = state.records.map((rec) => {
        const pt = point([rec.originLng, rec.originLat]);
        if (!booleanPointInPolygon(pt, polygon)) return rec;
        changedIds.push(rec.id);
        const factor = 1 + (Math.random() * 1.0 - 0.4);
        return { ...rec, travelTimeMin: rec.travelTimeMin * factor };
      });
      return { ...state, records: mutated, changedIds };
    }

    case 'REFRESH_SUBSET': {
      const polygon = state.selectedPolygon;
      if (!polygon) return state;
      const inside = state.records.filter((rec) =>
        booleanPointInPolygon(point([rec.originLng, rec.originLat]), polygon)
      );
      const subsetSize = Math.max(3, Math.min(20, Math.floor(inside.length * 0.3)));
      const shuffled = [...inside].sort(() => Math.random() - 0.5);
      const selectedIds = new Set(shuffled.slice(0, subsetSize).map((r) => r.id));
      const updated = state.records.map((rec) => {
        if (!selectedIds.has(rec.id)) return rec;
        const factor = 1 + (Math.random() * 1.0 - 0.4);
        return { ...rec, travelTimeMin: rec.travelTimeMin * factor };
      });
      return { ...state, records: updated, changedIds: [...selectedIds] };
    }

    case 'SET_ROUTE_POINT': {
      const pts = state.routePoints.length >= 2 ? [] : state.routePoints;
      const newPoints = [...pts, action.payload];
      return {
        ...state,
        routePoints: newPoints,
        // Clear geometry whenever starting a fresh route selection
        routeGeometry: pts.length === 0 ? null : state.routeGeometry,
        routeLoading: false,
      };
    }

    case 'SET_ROUTE_LOADING':
      return { ...state, routeLoading: true };

    case 'SET_ROUTE_GEOMETRY':
      return { ...state, routeGeometry: action.payload, routeLoading: false };

    case 'CALCULATE_ROUTE': {
      if (state.routePoints.length < 2) return state;
      const [a, b] = state.routePoints;
      const dist = state.routeGeometry
        ? geometryLengthKm(state.routeGeometry)
        : haversineKm(a.lat, a.lng, b.lat, b.lng);

      let nearest = state.records[0];
      let nearestOrig = state.originalRecords[0];
      let minD = Infinity;
      state.records.forEach((rec, i) => {
        const d = haversineKm(a.lat, a.lng, rec.originLat, rec.originLng);
        if (d < minD) {
          minD = d;
          nearest = rec;
          nearestOrig = state.originalRecords[i];
        }
      });

      return {
        ...state,
        lastCalculated: {
          distanceKm: dist,
          originalTime: nearestOrig.travelTimeMin,
          currentTime: nearest.travelTimeMin,
        },
      };
    }

    case 'CLEAR_POLYGON':
      return { ...state, selectedPolygon: null, records: state.originalRecords, changedIds: [] };

    case 'RESET':
      return {
        ...initialState,
        originalRecords: state.originalRecords,
        records: state.originalRecords,
      };

    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [picking, setpicking] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const drawHandlerRef = useRef(null);
  const clearDrawnRef = useRef(null);

  // Auto-fetch OSRM route whenever two route points are placed
  useEffect(() => {
    if (state.routePoints.length !== 2) return;
    let live = true;
    dispatch({ type: 'SET_ROUTE_LOADING' });
    const [a, b] = state.routePoints;
    fetchOsrmRoute(a, b).then((geometry) => {
      if (live) dispatch({ type: 'SET_ROUTE_GEOMETRY', payload: geometry });
    });
    return () => { live = false; };
  }, [state.routePoints]);

  return (
    <div className="app-layout">
      <MapView
        records={state.records}
        routePoints={state.routePoints}
        routeGeometry={state.routeGeometry}
        routeLoading={state.routeLoading}
        changedIds={state.changedIds}
        picking={picking}
        drawing={drawing}
        setDrawing={setDrawing}
        drawHandlerRef={drawHandlerRef}
        setVertexCount={setVertexCount}
        clearDrawnRef={clearDrawnRef}
        dispatch={dispatch}
        showGrid={showGrid}
      />
      <Controls
        state={state}
        dispatch={dispatch}
        picking={picking}
        setpicking={setpicking}
        drawing={drawing}
        setDrawing={setDrawing}
        drawHandlerRef={drawHandlerRef}
        vertexCount={vertexCount}
        clearDrawnRef={clearDrawnRef}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        routeLoading={state.routeLoading}
      />
    </div>
  );
}

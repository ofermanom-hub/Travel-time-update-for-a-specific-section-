import { useReducer, useRef, useState } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import seedData from './data/seedTravelTimes.js';
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

const initialState = {
  originalRecords: seedData,
  records: seedData,
  selectedPolygon: null,
  routePoints: [],
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
        const factor = 1 + (Math.random() * 1.0 - 0.4); // random(-0.4, +0.6)
        return { ...rec, travelTimeMin: rec.travelTimeMin * factor };
      });
      return { ...state, records: mutated, changedIds };
    }

    case 'REFRESH_SUBSET': {
      const polygon = state.selectedPolygon;
      if (!polygon) return state;
      // Collect all records whose origin is inside the polygon
      const inside = state.records.filter((rec) =>
        booleanPointInPolygon(point([rec.originLng, rec.originLat]), polygon)
      );
      // Pick a random ~30%, min 3, max 20
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
      return { ...state, routePoints: [...pts, action.payload] };
    }

    case 'CALCULATE_ROUTE': {
      if (state.routePoints.length < 2) return state;
      const [a, b] = state.routePoints;
      const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);

      // Find nearest record by origin proximity to point A
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
  const drawHandlerRef = useRef(null);
  const clearDrawnRef = useRef(null);

  return (
    <div className="app-layout">
      <MapView
        records={state.records}
        routePoints={state.routePoints}
        changedIds={state.changedIds}
        picking={picking}
        drawing={drawing}
        setDrawing={setDrawing}
        drawHandlerRef={drawHandlerRef}
        setVertexCount={setVertexCount}
        clearDrawnRef={clearDrawnRef}
        dispatch={dispatch}
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
      />
    </div>
  );
}

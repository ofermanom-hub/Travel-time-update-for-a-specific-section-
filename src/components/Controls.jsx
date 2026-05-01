export default function Controls({
  state, dispatch,
  picking, setpicking,
  drawing, setDrawing, drawHandlerRef,
  vertexCount, clearDrawnRef,
  showGrid, setShowGrid,
}) {
  const { records, originalRecords, lastCalculated, selectedPolygon, changedIds } = state;

  const modifiedCount = records.filter(
    (r, i) => r.travelTimeMin !== originalRecords[i].travelTimeMin
  ).length;

  function handleReset() {
    drawHandlerRef.current?.disable();
    clearDrawnRef.current?.();
    setDrawing(false);
    setpicking(false);
    dispatch({ type: 'RESET' });
  }

  function handleClearPolygon() {
    clearDrawnRef.current?.();
    dispatch({ type: 'CLEAR_POLYGON' });
  }

  function handleUndo() {
    drawHandlerRef.current?.deleteLastVertex();
  }

  function handleClosePolygon() {
    drawHandlerRef.current?._finishShape();
  }

  function handleRefreshGIS() {
    dispatch({ type: 'REFRESH_SUBSET' });
  }

  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">NYC Travel Time</h1>

      <section className="actions">
        <button
          className={`btn ${drawing ? 'btn-active' : ''}`}
          onClick={() => setDrawing((d) => !d)}
        >
          {drawing ? 'Cancel drawing' : 'Draw polygon'}
        </button>

        <button
          className={`btn ${picking ? 'btn-active' : ''}`}
          onClick={() => setpicking((p) => !p)}
        >
          {picking ? 'Cancel picking' : 'Pick route points'}
        </button>

        <button
          className="btn"
          onClick={() => dispatch({ type: 'CALCULATE_ROUTE' })}
          disabled={state.routePoints.length < 2}
        >
          Calculate travel time
        </button>

        <button className="btn btn-reset" onClick={handleReset}>
          Reset database
        </button>
      </section>

      {/* Drawing tools — visible while polygon is being drawn */}
      {drawing && (
        <section className="drawing-tools">
          <p className="hint">
            Click to place corners. Hover near the first point to snap-close, or use the buttons below.
          </p>
          <div className="drawing-btns">
            <button
              className="btn btn-sm"
              onClick={handleUndo}
              disabled={vertexCount === 0}
            >
              ↩ Undo
            </button>
            <button
              className="btn btn-sm btn-snap"
              onClick={handleClosePolygon}
              disabled={vertexCount < 3}
            >
              ⬡ Close polygon
            </button>
          </div>
        </section>
      )}

      {/* Polygon actions — visible once a polygon has been drawn */}
      {selectedPolygon && !drawing && (
        <section className="polygon-tools">
          <button className="btn btn-refresh" onClick={handleRefreshGIS}>
            ↻ Refresh travel time from new GIS data
          </button>
          {changedIds.length > 0 && (
            <p className="hint">
              {changedIds.length} route{changedIds.length !== 1 ? 's' : ''} updated — highlighted on map.
            </p>
          )}
          <button className="btn btn-outline-danger" onClick={handleClearPolygon}>
            ✕ Reset polygon
          </button>
        </section>
      )}

      {picking && (
        <p className="hint">Click the map to place up to 2 route markers (green = start, red = end).</p>
      )}

      {lastCalculated && (
        <section className="results">
          <h2>Results</h2>
          <div className="result-row">
            <span>Haversine distance</span>
            <strong>{lastCalculated.distanceKm.toFixed(2)} km</strong>
          </div>
          <div className="result-row">
            <span>Original time</span>
            <strong>{lastCalculated.originalTime.toFixed(1)} min</strong>
          </div>
          <div className="result-row">
            <span>Current time</span>
            <strong
              className={
                lastCalculated.currentTime > lastCalculated.originalTime
                  ? 'worse'
                  : lastCalculated.currentTime < lastCalculated.originalTime
                  ? 'better'
                  : ''
              }
            >
              {lastCalculated.currentTime.toFixed(1)} min
            </strong>
          </div>
        </section>
      )}

      <section className="stats">
        <div className="stat">
          <span className="stat-label">Total records</span>
          <span className="stat-value">{records.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Modified</span>
          <span className="stat-value modified">{modifiedCount}</span>
        </div>
      </section>

      <section className="map-layers">
        <h2>Map layers</h2>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Show route grid ({state.records.length} lines)
        </label>
      </section>

      <section className="legend">
        <h2>Travel time legend</h2>
        <div className="legend-row"><span className="dot green" /> &lt; 10 min</div>
        <div className="legend-row"><span className="dot amber" /> 10 – 25 min</div>
        <div className="legend-row"><span className="dot red" /> &gt; 25 min</div>
      </section>
    </aside>
  );
}

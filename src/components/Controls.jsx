export default function Controls({ state, dispatch, picking, setpicking }) {
  const { records, originalRecords, lastCalculated } = state;

  const modifiedCount = records.filter(
    (r, i) => r.travelTimeMin !== originalRecords[i].travelTimeMin
  ).length;

  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">NYC Travel Time</h1>

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

      <section className="legend">
        <h2>Travel time legend</h2>
        <div className="legend-row">
          <span className="dot green" /> &lt; 10 min
        </div>
        <div className="legend-row">
          <span className="dot amber" /> 10 – 25 min
        </div>
        <div className="legend-row">
          <span className="dot red" /> &gt; 25 min
        </div>
      </section>

      <section className="instructions">
        <h2>Draw a polygon</h2>
        <p>
          Use the polygon tool (top-right of map) to select an area. All route
          origins inside the polygon will have their travel times randomly mutated
          to simulate new traffic data.
        </p>
      </section>

      <section className="route-section">
        <h2>Point-to-point calculator</h2>
        <button
          className={`btn ${picking ? 'btn-active' : ''}`}
          onClick={() => setpicking((p) => !p)}
        >
          {picking ? 'Cancel picking' : 'Pick route points'}
        </button>
        {picking && (
          <p className="hint">
            Click the map to place up to 2 route markers (green = start, red = end).
          </p>
        )}
        <button
          className="btn"
          onClick={() => dispatch({ type: 'CALCULATE_ROUTE' })}
          disabled={state.routePoints.length < 2}
        >
          Calculate travel time
        </button>
      </section>

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

      <button
        className="btn btn-reset"
        onClick={() => {
          dispatch({ type: 'RESET' });
          setpicking(false);
        }}
      >
        Reset database
      </button>
    </aside>
  );
}

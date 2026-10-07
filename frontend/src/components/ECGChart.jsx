import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import LoadingState from './LoadingState.jsx';
import ErrorState from './ErrorState.jsx';

const BEAT_COLORS = {
  N: '#137333',
  S: '#b06000',
  V: '#c5221f',
  F: '#1a73e8',
  unclassified_edge_beat: '#5f6368',
};

function getBeatColor(cls) {
  return BEAT_COLORS[cls] || '#1f5f6b';
}

/**
 * ECG Waveform Chart rendering continuous signal channels and overlaying
 * predicted heartbeat markers within the active temporal viewing window.
 */
export default function ECGChart({
  signal,
  beats = [],
  selectedBeatIndex = null,
  loading = false,
  error = null,
  onRetry,
  onSelectBeat,
}) {
  if (loading && !signal) return <LoadingState label="Loading ECG signal…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!signal || !signal.time?.length) return <div className="state">No signal data available.</div>;

  const minTime = signal.time[0];
  const maxTime = signal.time[signal.time.length - 1];

  // Find beats residing strictly inside the visible time window
  const visibleBeats = useMemo(() => {
    if (!beats || beats.length === 0) return [];
    return beats.filter((b) => b.time_seconds >= minTime && b.time_seconds <= maxTime);
  }, [beats, minTime, maxTime]);

  return (
    <div className={loading ? 'chart-wrap is-loading' : 'chart-wrap'}>
      {signal.channels.map((ch, idx) => {
        const rows = signal.time.map((t, i) => ({ t, v: ch.values[i] }));
        return (
          <div key={`${ch.name}-${idx}`} className="chart">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <div className="chart-label" style={{ fontWeight: 600 }}>
                Lead {ch.name} ({ch.unit || 'mV'})
              </div>
              {visibleBeats.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {visibleBeats.length} beats detected in window
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rows} syncId="ecg" margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e5ea" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(t) => t.toFixed(1)}
                  label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -2 }}
                />
                <YAxis domain={['auto', 'auto']} width={48} />
                <Tooltip
                  formatter={(v) => [`${v} ${ch.unit}`, ch.name]}
                  labelFormatter={(t) => `t = ${Number(t).toFixed(3)} s`}
                />

                {/* Overlay Prediction Reference Lines on R-peak positions */}
                {visibleBeats.map((b) => {
                  const isSelected = selectedBeatIndex === b.beat_index;
                  const color = getBeatColor(b.predicted_class);
                  return (
                    <ReferenceLine
                      key={`beat-marker-${b.beat_index}`}
                      x={b.time_seconds}
                      stroke={color}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      strokeDasharray={isSelected ? undefined : '3 2'}
                      label={{
                        value: b.is_valid ? b.predicted_class : 'Edge',
                        position: 'top',
                        fill: color,
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                  );
                })}

                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#1f5f6b"
                  dot={false}
                  strokeWidth={1.3}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}

      {/* Interactive beat chip bar for visible beats */}
      {visibleBeats.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Visible Beats:</span>
          {visibleBeats.slice(0, 15).map((b) => {
            const isSelected = selectedBeatIndex === b.beat_index;
            const badgeClass = !b.is_valid ? 'badge-edge' : `badge-${b.predicted_class}`;
            return (
              <button
                key={b.beat_index}
                type="button"
                onClick={() => onSelectBeat?.(b)}
                className={`badge ${badgeClass}`}
                style={{
                  border: isSelected ? '2px solid #000' : undefined,
                  cursor: 'pointer',
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.75rem',
                }}
                title={`Click to inspect Beat #${b.beat_index} at ${b.time_seconds.toFixed(2)}s`}
              >
                #{b.beat_index}: {b.is_valid ? b.predicted_class : 'Edge'}
              </button>
            );
          })}
          {visibleBeats.length > 15 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              +{visibleBeats.length - 15} more in window
            </span>
          )}
        </div>
      )}
    </div>
  );
}

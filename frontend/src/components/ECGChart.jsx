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
import { getAnnotationMeta, AAMI_CLASSES } from '../utils/aamiTaxonomy.js';
import LoadingState from './LoadingState.jsx';
import ErrorState from './ErrorState.jsx';
import ClassBadge from './ClassBadge.jsx';

const LEAD_COLORS = ['#00e5ff', '#10b981', '#f59e0b', '#3b82f6'];

/** Custom dark telemetry tooltip */
function CustomECGTooltip({ active, payload, label, unit = 'mV' }) {
  if (!active || !payload || !payload.length) return null;
  const timeSec = Number(label);
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.82rem',
        minWidth: '150px',
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: '0.3rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
        Time: <strong style={{ color: '#f8fafc' }}>{timeSec.toFixed(3)}s</strong>
      </div>
      {payload.map((entry, idx) => (
        <div
          key={`tip-${idx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            color: entry.color || '#00e5ff',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          <span>{entry.name || 'Signal'}:</span>
          <span>
            {typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Interactive ECG Waveform Chart.
 * Displays physical telemetry leads, time scales, and beat annotation overlays.
 */
export default function ECGChart({
  signal,
  annotations = null,
  beats = null,
  selectedAnnotation = null,
  selectedLeadIndex = 'all', // 'all' or numeric channel index
  loading = false,
  error = null,
  onRetry,
  onSelectAnnotation,
}) {
  if (loading && !signal) {
    return <LoadingState label="Streaming ECG waveform samples from backend…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!signal || !signal.time || signal.time.length === 0) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface-1)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-subtle)',
        }}
      >
        No ECG waveform points available for this time window.
      </div>
    );
  }

  const minTime = signal.time[0];
  const maxTime = signal.time[signal.time.length - 1];

  // Filter channels based on selected lead
  const visibleChannels = useMemo(() => {
    if (!signal.channels) return [];
    if (selectedLeadIndex === 'all') return signal.channels;
    const idx = Number(selectedLeadIndex);
    return signal.channels[idx] ? [signal.channels[idx]] : signal.channels;
  }, [signal.channels, selectedLeadIndex]);

  // Filter annotations residing strictly inside the visible time window
  const visibleAnnotations = useMemo(() => {
    if (!annotations?.annotations) return [];
    return annotations.annotations.filter((a) => a.time >= minTime && a.time <= maxTime);
  }, [annotations, minTime, maxTime]);

  // Optional model predictions inside visible window
  const visibleBeats = useMemo(() => {
    if (!beats || !Array.isArray(beats)) return [];
    return beats.filter((b) => b.time_seconds >= minTime && b.time_seconds <= maxTime);
  }, [beats, minTime, maxTime]);

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--bg-app)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
      }}
    >
      {/* Chart Channels */}
      {visibleChannels.map((channel, channelIdx) => {
        const leadColor = LEAD_COLORS[channelIdx % LEAD_COLORS.length];
        const rows = signal.time.map((t, i) => ({
          t,
          v: channel.values[i],
        }));

        return (
          <div
            key={`lead-${channel.name}-${channelIdx}`}
            style={{
              marginBottom: visibleChannels.length > 1 && channelIdx < visibleChannels.length - 1 ? '1.5rem' : '0',
            }}
          >
            {/* Lead Channel Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.5rem',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.5rem',
                borderLeft: `3px solid ${leadColor}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: leadColor }}>
                  Lead {channel.name}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ({channel.unit || 'mV'})
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {rows.length.toLocaleString()} plotted points
              </div>
            </div>

            {/* Recharts Canvas */}
            <ResponsiveContainer width="100%" height={visibleChannels.length > 1 ? 220 : 300}>
              <LineChart
                data={rows}
                syncId="ecg-studio"
                margin={{ top: 18, right: 20, bottom: 6, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[minTime, maxTime]}
                  tickFormatter={(t) => `${t.toFixed(1)}s`}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{
                    value: 'Time in Seconds (s)',
                    position: 'insideBottomRight',
                    offset: -4,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  width={52}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => typeof v === 'number' ? v.toFixed(2) : v}
                />
                <Tooltip
                  content={<CustomECGTooltip unit={channel.unit || 'mV'} />}
                />

                {/* Vertical Beat Annotation Markers */}
                {visibleAnnotations.map((ann, aIdx) => {
                  const meta = getAnnotationMeta(ann.symbol);
                  const isSelected = selectedAnnotation?.sample === ann.sample;
                  const strokeColor = meta.classInfo?.color || '#94a3b8';

                  return (
                    <ReferenceLine
                      key={`ann-${ann.sample}-${aIdx}`}
                      x={ann.time}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      strokeDasharray={isSelected ? undefined : '3 3'}
                      label={{
                        value: ann.symbol,
                        position: 'top',
                        fill: strokeColor,
                        fontSize: isSelected ? 12 : 10,
                        fontWeight: 'bold',
                      }}
                    />
                  );
                })}

                <Line
                  type="monotone"
                  dataKey="v"
                  name={channel.name}
                  stroke={leadColor}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}

      {/* Visible Annotation Interactive Chip Bar */}
      {visibleAnnotations.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Visible Beat Annotations ({visibleAnnotations.length} in window):
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any marker to inspect beat details
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              maxHeight: '110px',
              overflowY: 'auto',
            }}
          >
            {visibleAnnotations.map((ann, idx) => {
              const meta = getAnnotationMeta(ann.symbol);
              const isSelected = selectedAnnotation?.sample === ann.sample;
              const aamiClass = meta.aamiClass || 'edge';

              return (
                <button
                  key={`ann-chip-${ann.sample}-${idx}`}
                  type="button"
                  onClick={() => onSelectAnnotation?.(ann)}
                  className={`badge class-badge class-badge-${aamiClass}`}
                  style={{
                    cursor: 'pointer',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.78rem',
                    border: isSelected ? '2px solid #00e5ff' : undefined,
                    boxShadow: isSelected ? '0 0 10px rgba(0, 229, 255, 0.4)' : undefined,
                    transition: 'all 0.15s ease',
                  }}
                  title={`${meta.description} at ${ann.time.toFixed(2)}s (Sample #${ann.sample})`}
                >
                  <span>{ann.symbol}</span>
                  <span style={{ opacity: 0.8, fontSize: '0.72rem' }}>
                    {ann.time.toFixed(2)}s
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

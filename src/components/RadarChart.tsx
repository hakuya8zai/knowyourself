'use client';

import { useEffect, useState } from 'react';
import type { SpectrumData } from '@/lib/api';

interface Props {
  spectrum: SpectrumData;
}

const LABELS = ['行動力', '社交力', '創造力', '分析力', '直覺力', '韌性'];
const KEYS: (keyof SpectrumData)[] = ['action', 'social', 'creativity', 'analysis', 'intuition', 'resilience'];

const CENTER = 160;
const RADIUS = 120;
const LABEL_RADIUS = 148;
const DOT_RADIUS = 4;

function polarToXY(angleDeg: number, r: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

function getPolygonPoints(values: number[], maxRadius: number): string {
  return values
    .map((v, i) => {
      const angle = (360 / 6) * i;
      const r = (v / 100) * maxRadius;
      const [x, y] = polarToXY(angle, r);
      return `${x},${y}`;
    })
    .join(' ');
}

function getGridPolygon(scale: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (360 / 6) * i;
    const [x, y] = polarToXY(angle, RADIUS * scale);
    return `${x},${y}`;
  }).join(' ');
}

export function RadarChart({ spectrum }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setAnimated(true);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const values = KEYS.map(k => spectrum[k]);
  const dataPoints = getPolygonPoints(values, RADIUS);

  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
      <svg
        viewBox="0 0 320 320"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon
            key={scale}
            points={getGridPolygon(scale)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i;
          const [x, y] = polarToXY(angle, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={animated ? dataPoints : getPolygonPoints([0, 0, 0, 0, 0, 0], RADIUS)}
          fill="rgba(127, 90, 240, 0.15)"
          stroke="rgba(127, 90, 240, 0.6)"
          strokeWidth="1.5"
          style={{
            transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />

        {/* Data points / dots */}
        {values.map((v, i) => {
          const angle = (360 / 6) * i;
          const r = animated ? (v / 100) * RADIUS : 0;
          const [x, y] = polarToXY(angle, r);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={DOT_RADIUS}
              fill="#7f5af0"
              style={{
                transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
                transitionDelay: `${i * 0.05}s`,
              }}
            />
          );
        })}

        {/* Labels */}
        {LABELS.map((label, i) => {
          const angle = (360 / 6) * i;
          const [x, y] = polarToXY(angle, LABEL_RADIUS);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#b8b2a8"
              fontSize="12"
              fontFamily="'Noto Sans TC', sans-serif"
              fontWeight="500"
            >
              {label}
            </text>
          );
        })}

        {/* Value labels */}
        {values.map((v, i) => {
          const angle = (360 / 6) * i;
          const r = animated ? (v / 100) * RADIUS : 0;
          // Offset the value label slightly outward from the dot
          const labelOffset = 16;
          const [lx, ly] = polarToXY(angle, r + labelOffset);
          return (
            <text
              key={`val-${i}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(127, 90, 240, 0.8)"
              fontSize="11"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="600"
              style={{
                opacity: animated ? 1 : 0,
                transition: 'opacity 0.6s ease',
                transitionDelay: `${0.8 + i * 0.05}s`,
              }}
            >
              {v}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

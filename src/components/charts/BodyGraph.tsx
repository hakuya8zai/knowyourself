'use client';

/**
 * Human Design Body Graph SVG
 * 9 Centers with channels connecting them
 */

interface Center {
  name: string;
  defined: boolean;
}

interface Channel {
  gate1: number;
  gate2: number;
}

interface Props {
  centers: Center[];
  channels?: Channel[];
}

// Center positions (relative to 300x400 viewBox)
const CENTER_POSITIONS: Record<string, { x: number; y: number; shape: 'triangle' | 'square' | 'diamond' }> = {
  '頭頂中心': { x: 150, y: 35, shape: 'triangle' },
  'Head': { x: 150, y: 35, shape: 'triangle' },
  '邏輯中心': { x: 150, y: 80, shape: 'triangle' },
  'Ajna': { x: 150, y: 80, shape: 'triangle' },
  '喉嚨中心': { x: 150, y: 135, shape: 'square' },
  'Throat': { x: 150, y: 135, shape: 'square' },
  'G中心': { x: 150, y: 195, shape: 'diamond' },
  'G Center': { x: 150, y: 195, shape: 'diamond' },
  '意志力中心': { x: 100, y: 220, shape: 'triangle' },
  'Heart': { x: 100, y: 220, shape: 'triangle' },
  '情緒中心': { x: 200, y: 290, shape: 'triangle' },
  'Solar Plexus': { x: 200, y: 290, shape: 'triangle' },
  '薦骨中心': { x: 150, y: 280, shape: 'square' },
  'Sacral': { x: 150, y: 280, shape: 'square' },
  '脾中心': { x: 85, y: 280, shape: 'triangle' },
  'Spleen': { x: 85, y: 280, shape: 'triangle' },
  '根部中心': { x: 150, y: 360, shape: 'square' },
  'Root': { x: 150, y: 360, shape: 'square' },
};

// Connections between centers (simplified)
const CENTER_CONNECTIONS: Array<[string, string]> = [
  ['頭頂中心', '邏輯中心'],
  ['邏輯中心', '喉嚨中心'],
  ['喉嚨中心', 'G中心'],
  ['G中心', '意志力中心'],
  ['G中心', '薦骨中心'],
  ['意志力中心', '喉嚨中心'],
  ['意志力中心', '脾中心'],
  ['薦骨中心', '脾中心'],
  ['薦骨中心', '情緒中心'],
  ['薦骨中心', '根部中心'],
  ['脾中心', '根部中心'],
  ['情緒中心', '根部中心'],
];

function getCenterPosition(name: string): { x: number; y: number; shape: 'triangle' | 'square' | 'diamond' } | null {
  // Try exact match first
  if (CENTER_POSITIONS[name]) return CENTER_POSITIONS[name];
  
  // Try partial match
  for (const [key, val] of Object.entries(CENTER_POSITIONS)) {
    if (name.includes(key) || key.includes(name)) return val;
  }
  
  return null;
}

function Triangle({ x, y, size, fill, stroke }: { x: number; y: number; size: number; fill: string; stroke: string }) {
  const h = size * 0.866; // height of equilateral triangle
  const points = `${x},${y - h/2} ${x - size/2},${y + h/2} ${x + size/2},${y + h/2}`;
  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth="2" />;
}

function Square({ x, y, size, fill, stroke }: { x: number; y: number; size: number; fill: string; stroke: string }) {
  return (
    <rect 
      x={x - size/2} 
      y={y - size/2} 
      width={size} 
      height={size} 
      fill={fill} 
      stroke={stroke} 
      strokeWidth="2" 
    />
  );
}

function Diamond({ x, y, size, fill, stroke }: { x: number; y: number; size: number; fill: string; stroke: string }) {
  const points = `${x},${y - size/2} ${x + size/2},${y} ${x},${y + size/2} ${x - size/2},${y}`;
  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth="2" />;
}

export function BodyGraph({ centers }: Props) {
  const width = 300;
  const height = 400;

  // Create a map of which centers are defined
  const definedCenters = new Set<string>();
  centers.forEach(c => {
    if (c.defined) {
      definedCenters.add(c.name);
      // Also add alternative names
      for (const key of Object.keys(CENTER_POSITIONS)) {
        if (c.name.includes(key) || key.includes(c.name)) {
          definedCenters.add(key);
        }
      }
    }
  });

  // Check if a connection should be highlighted (both ends defined)
  const isConnectionActive = (c1: string, c2: string): boolean => {
    const pos1 = getCenterPosition(c1);
    const pos2 = getCenterPosition(c2);
    if (!pos1 || !pos2) return false;
    
    // Check if both centers are defined
    let def1 = false, def2 = false;
    for (const name of definedCenters) {
      if (c1.includes(name) || name.includes(c1)) def1 = true;
      if (c2.includes(name) || name.includes(c2)) def2 = true;
    }
    return def1 && def2;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 280, height: 'auto' }}>
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.2)" rx="8" />

      {/* Connections */}
      {CENTER_CONNECTIONS.map(([c1, c2], i) => {
        const pos1 = getCenterPosition(c1);
        const pos2 = getCenterPosition(c2);
        if (!pos1 || !pos2) return null;
        
        const active = isConnectionActive(c1, c2);
        
        return (
          <line
            key={i}
            x1={pos1.x}
            y1={pos1.y}
            x2={pos2.x}
            y2={pos2.y}
            stroke={active ? '#7f5af0' : 'rgba(255,255,255,0.15)'}
            strokeWidth={active ? 3 : 1}
          />
        );
      })}

      {/* Centers */}
      {centers.map((center, i) => {
        const pos = getCenterPosition(center.name);
        if (!pos) return null;
        
        const defined = center.defined;
        const fill = defined ? 'rgba(127, 90, 240, 0.3)' : 'rgba(0,0,0,0.5)';
        const stroke = defined ? '#7f5af0' : 'rgba(255,255,255,0.3)';
        const size = 30;
        
        const ShapeComponent = 
          pos.shape === 'triangle' ? Triangle :
          pos.shape === 'diamond' ? Diamond : Square;
        
        return (
          <g key={i}>
            <ShapeComponent x={pos.x} y={pos.y} size={size} fill={fill} stroke={stroke} />
          </g>
        );
      })}

      {/* Labels */}
      <text x={150} y={height - 10} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">
        人類圖能量中心
      </text>
    </svg>
  );
}

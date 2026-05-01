'use client';

import { useState } from 'react';
import Link from 'next/link';
import { stateData, SALE_TYPE_COLORS, type StateData } from '@/lib/state-data';

interface USMapProps {
  className?: string;
}

// Accurate US State SVG paths based on Albers projection
const STATE_PATHS: Record<string, string> = {
  // West Coast & Mountain
  WA: 'M55,15 L95,15 L95,55 L78,55 L75,62 L55,62 Z',
  OR: 'M55,62 L75,62 L78,55 L95,55 L95,80 L55,80 Z',
  CA: 'M35,80 L95,80 L95,145 L45,145 L35,135 Z',
  NV: 'M95,80 L135,80 L135,125 L95,125 Z',
  ID: 'M95,15 L145,15 L145,62 L95,62 Z',
  MT: 'M145,15 L230,15 L230,55 L145,55 Z',
  WY: 'M145,55 L230,55 L230,95 L145,95 Z',
  UT: 'M145,95 L195,95 L195,130 L145,130 Z',
  CO: 'M195,95 L255,95 L255,130 L195,130 Z',
  AZ: 'M145,130 L195,130 L195,165 L145,165 Z',
  NM: 'M195,130 L255,130 L255,170 L195,170 Z',

  // Midwest
  ND: 'M230,15 L310,15 L310,55 L230,55 Z',
  SD: 'M230,55 L310,55 L310,95 L230,95 Z',
  NE: 'M230,95 L310,95 L310,130 L230,130 Z',
  KS: 'M230,130 L310,130 L310,165 L230,165 Z',
  OK: 'M230,165 L310,165 L310,200 L230,200 Z',
  TX: 'M195,200 L310,200 L310,250 L220,250 L195,220 Z',

  // Great Lakes / Midwest
  MN: 'M310,15 L370,15 L370,35 L360,45 L370,55 L310,55 L310,35 Z',
  IA: 'M310,55 L370,55 L370,95 L310,95 Z',
  MO: 'M310,95 L370,95 L370,130 L345,130 L340,140 L310,140 Z',
  AR: 'M310,165 L370,165 L370,185 L345,195 L310,195 Z',
  LA: 'M310,195 L345,195 L360,210 L335,225 L310,215 Z',

  // Southeast
  WI: 'M370,45 L400,45 L410,55 L410,75 L370,75 Z',
  IL: 'M370,75 L410,75 L410,110 L370,110 Z',
  MS: 'M345,165 L370,165 L370,195 L345,195 Z',
  AL: 'M370,165 L395,165 L395,195 L370,195 Z',
  GA: 'M395,165 L425,165 L435,175 L425,190 L395,190 Z',
  FL: 'M375,190 L425,190 L440,210 L420,230 L390,230 L375,215 Z',
  SC: 'M425,165 L445,165 L450,175 L435,175 Z',
  NC: 'M425,140 L455,140 L455,165 L445,165 L425,165 Z',
  TN: 'M345,140 L395,140 L395,165 L370,165 L345,165 Z',
  KY: 'M370,110 L410,110 L420,120 L410,130 L395,140 L370,140 Z',
  IN: 'M410,75 L435,75 L435,110 L410,110 Z',
  OH: 'M435,75 L465,75 L465,100 L435,100 Z',
  WV: 'M435,100 L465,100 L455,120 L435,110 Z',
  VA: 'M455,120 L485,120 L485,140 L455,140 Z',

  // Northeast
  MI: 'M400,45 L430,45 L435,55 L430,75 L400,65 L405,55 Z M405,75 L425,75 L425,85 L405,85 Z',
  PA: 'M465,85 L490,85 L490,110 L465,110 Z',
  NY: 'M455,50 L490,50 L500,60 L490,85 L465,85 L465,60 L455,60 Z',
  VT: 'M490,30 L505,30 L505,50 L490,50 Z',
  NH: 'M505,30 L515,30 L515,50 L505,50 Z',
  ME: 'M515,20 L535,20 L540,45 L525,60 L515,50 Z',
  MA: 'M505,50 L525,50 L520,70 L505,65 Z',
  RI: 'M520,70 L530,70 L525,80 L520,75 Z',
  CT: 'M505,65 L520,65 L515,80 L505,75 Z',
  NJ: 'M490,85 L500,85 L500,100 L490,100 Z',
  DE: 'M485,105 L500,105 L500,115 L485,115 Z',
  MD: 'M475,100 L485,100 L485,120 L465,120 L465,110 L475,110 Z',
  DC: 'M480,115 L485,115 L485,120 L480,120 Z',

  // Alaska & Hawaii (insets)
  AK: 'M50,280 L120,280 L130,300 L110,320 L50,310 Z',
  HI: 'M80,340 L120,340 L120,360 L80,360 Z',
};

export function USMap({ className = '' }: USMapProps) {
  const [hoveredState, setHoveredState] = useState<StateData | null>(null);

  const getStateFill = (code: string) => {
    const state = stateData.find(s => s.code === code);
    if (!state) return '#64748b'; // slate-500 default
    return SALE_TYPE_COLORS[state.sale_type].fill;
  };

  const getStateOpacity = (code: string) => {
    if (!hoveredState) return 1;
    return hoveredState.code === code ? 1 : 0.6;
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 580 380"
        className="w-full h-auto"
        style={{ maxWidth: '900px' }}
      >
        {/* Background */}
        <rect width="580" height="380" fill="#0f172a" rx="8" />

        {/* State paths */}
        {Object.entries(STATE_PATHS).map(([code, path]) => {
          const state = stateData.find(s => s.code === code);
          const isHovered = hoveredState?.code === code;

          return (
            <Link key={code} href={`/states/${code.toLowerCase()}`}>
              <path
                d={path}
                fill={getStateFill(code)}
                stroke="#1e293b"
                strokeWidth={isHovered ? "2" : "1"}
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: getStateOpacity(code),
                  filter: isHovered ? 'brightness(1.1)' : 'none'
                }}
                onMouseEnter={() => setHoveredState(state || null)}
                onMouseLeave={() => setHoveredState(null)}
              />
            </Link>
          );
        })}

        {/* State labels for key states */}
        {[
          ['TX', 252, 220], ['CA', 65, 110], ['FL', 405, 210],
          ['NY', 472, 68], ['PA', 477, 98], ['IL', 420, 93],
          ['OH', 450, 88], ['GA', 410, 178], ['NC', 460, 153],
          ['MI', 415, 60], ['WA', 75, 38], ['AZ', 170, 148],
          ['UT', 170, 113], ['CO', 225, 113], ['NV', 115, 103],
        ].map(([code, x, y]) => (
          <text
            key={code}
            x={x}
            y={y}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            className="pointer-events-none select-none"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            {code}
          </text>
        ))}

        {/* Alaska & Hawaii labels */}
        <text x="85" y="295" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">AK</text>
        <text x="100" y="355" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">HI</text>
      </svg>

      {/* Hover tooltip */}
      {hoveredState && (
        <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-10 min-w-[200px]">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: SALE_TYPE_COLORS[hoveredState.sale_type].fill }}
            />
            <span className="font-bold text-slate-100 text-lg">{hoveredState.name}</span>
          </div>
          <div className={`text-sm font-medium mb-1 ${SALE_TYPE_COLORS[hoveredState.sale_type].text}`}>
            {SALE_TYPE_COLORS[hoveredState.sale_type].label}
          </div>
          {hoveredState.interest_rate && (
            <div className="text-xs text-slate-400 mb-1">
              Interest: {hoveredState.interest_rate}
            </div>
          )}
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
            {hoveredState.has_properties
              ? '✓ Properties Available →'
              : 'Coming Soon'}
          </div>
        </div>
      )}
    </div>
  );
}

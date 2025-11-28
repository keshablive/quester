import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface QuesterLogoProps {
  size?: number;
  color?: string;
}

export function QuesterLogo({ size = 48, color = '#000000' }: QuesterLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <G transform="translate(50, 50)">
        {/* Center circle */}
        <Circle cx="0" cy="0" r="8" fill={color} />
        
        {/* Orbital rings */}
        {/* Horizontal orbital */}
        <Path
          d="M -35 0 Q -35 -15, 0 -15 Q 35 -15, 35 0 Q 35 15, 0 15 Q -35 15, -35 0"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
        />
        
        {/* Diagonal orbital 1 (tilted ~60 degrees) */}
        <Path
          d="M -17.5 -30.3 Q -32.5 -22.5, -32.5 0 Q -32.5 22.5, -17.5 30.3 Q -2.5 38, 17.5 30.3 Q 32.5 22.5, 32.5 0 Q 32.5 -22.5, 17.5 -30.3 Q 2.5 -38, -17.5 -30.3"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
        />
        
        {/* Diagonal orbital 2 (tilted ~-60 degrees) */}
        <Path
          d="M 17.5 -30.3 Q 32.5 -22.5, 32.5 0 Q 32.5 22.5, 17.5 30.3 Q 2.5 38, -17.5 30.3 Q -32.5 22.5, -32.5 0 Q -32.5 -22.5, -17.5 -30.3 Q -2.5 -38, 17.5 -30.3"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
        />
      </G>
    </Svg>
  );
}

import React from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export const PartyPopperIcon: React.FC<Props> = ({ size = 28, color = "#FFFFFF" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cone Body */}
      <Path
        d="M5.5 26.5L14.5 9.5L22.5 17.5L5.5 26.5Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stripe 1 */}
      <Path
        d="M8.5 20.5L17.5 12"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stripe 2 */}
      <Path
        d="M12.5 23.5L20.5 15.5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top Spark */}
      <Path d="M17.5 5V2" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      {/* Curved Middle Burst */}
      <Path
        d="M22 8C23.8 6.2 26 5.8 28.5 4"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Upper-Right Spark */}
      <Path d="M26.5 10.5L29.5 9.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      {/* Right Spark */}
      <Path d="M27.5 16.5L30.5 17.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  );
};

export default PartyPopperIcon;

import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  opacity?: number;
};

/** Figma Archive tab icon (`inbox`) — node 460:1824 / 460:1842 */
export const TabInboxIcon = ({ size = 24, color = "#FFFFFF", opacity = 1 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
    <Path
      d="M22 12H16L14 15H10L8 12H2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.45 5.11L2 12V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20H20C20.5304 20 21.0391 19.7893 21.4142 19.4142C21.7893 19.0391 22 18.5304 22 18V12L18.55 5.11C18.3844 4.77679 18.1292 4.49637 17.813 4.30028C17.4967 4.10419 17.1321 4.0002 16.76 4H7.24C6.86792 4.0002 6.50326 4.10419 6.18704 4.30028C5.87083 4.49637 5.61558 4.77679 5.45 5.11Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default TabInboxIcon;

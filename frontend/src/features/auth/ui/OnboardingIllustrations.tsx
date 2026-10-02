import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text } from "react-native-svg";

type IllustrationProps = {
  width?: number;
  height?: number;
};

export const DiscoverIllustration = ({ width = 300, height = 300 }: IllustrationProps) => (
  <Svg width={width} height={height} viewBox="0 0 300 300">
    <G transform="rotate(-10 150 150)">
      <Rect x={55} y={70} width={130} height={150} rx={18} fill="#ffffff" />
      <Circle cx={120} cy={120} r={22} fill="#eef0fb" />
      <Path
        d="M108 128 l8-16 6 8 8-14 8 8"
        stroke="#2c4bf0"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={72} y={168} width={96} height={9} rx={4.5} fill="#e7e9f2" />
      <Rect x={72} y={184} width={66} height={9} rx={4.5} fill="#e7e9f2" />
    </G>
    <G transform="rotate(-2 150 150)">
      <Rect x={90} y={55} width={130} height={150} rx={18} fill="#2f5cf0" />
      <Circle cx={155} cy={105} r={22} fill="#ffffff" fillOpacity={0.18} />
      <Path
        d="M143 112 c4-10 4-16 0-22 M155 112 c4-14 4-20 0-28 M167 112 c4-8 4-12 0-16"
        stroke="#ffffff"
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={107} y={153} width={96} height={9} rx={4.5} fill="#ffffff" fillOpacity={0.3} />
      <Rect x={107} y={169} width={66} height={9} rx={4.5} fill="#ffffff" fillOpacity={0.2} />
    </G>
    <G transform="rotate(9 150 150)">
      <Rect x={130} y={75} width={130} height={150} rx={18} fill="#132a8f" />
      <Circle cx={195} cy={125} r={22} fill="#ffffff" fillOpacity={0.15} />
      <Path
        d="M183 133 L195 113 L207 133"
        stroke="#f0b73f"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={147} y={173} width={96} height={9} rx={4.5} fill="#ffffff" fillOpacity={0.25} />
      <Rect x={147} y={189} width={66} height={9} rx={4.5} fill="#ffffff" fillOpacity={0.15} />
    </G>
  </Svg>
);

export const CompeteIllustration = ({ width = 300, height = 300 }: IllustrationProps) => (
  <Svg width={width} height={height} viewBox="0 0 300 300">
    <Path
      d="M40 220 Q150 140 260 220"
      stroke="#3f63ff"
      strokeWidth={2}
      strokeDasharray="1 14"
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx={40} cy={220} r={4} fill="#3f63ff" />
    <Circle cx={260} cy={220} r={4} fill="#3f63ff" />

    <Circle cx={90} cy={110} r={46} fill="#ffffff" />
    <Circle cx={90} cy={98} r={16} fill="#c9cee0" />
    <Path d="M64 148 c0-20 12-30 26-30 s26 10 26 30" fill="#c9cee0" />

    <Circle cx={210} cy={110} r={46} fill="#2f5cf0" />
    <Circle cx={210} cy={98} r={16} fill="#ffffff" fillOpacity={0.55} />
    <Path d="M184 148 c0-20 12-30 26-30 s26 10 26 30" fill="#ffffff" fillOpacity={0.55} />

    <Circle cx={150} cy={110} r={24} fill="#0d0f18" />
    <Text x={150} y={117} fontSize={15} fontWeight="700" fill="#f0b73f" textAnchor="middle">
      VS
    </Text>

    <Rect x={55} y={176} width={70} height={10} rx={5} fill="#3f63ff" />
    <Rect x={55} y={176} width={45} height={10} rx={5} fill="#8fa6ff" />
    <Rect x={175} y={176} width={70} height={10} rx={5} fill="#3f63ff" />
    <Rect x={175} y={176} width={30} height={10} rx={5} fill="#8fa6ff" />
  </Svg>
);

export const AchieveIllustration = ({ width = 300, height = 300 }: IllustrationProps) => (
  <Svg width={width} height={height} viewBox="0 0 300 300">
    <Defs>
      <LinearGradient
        id="medalGrad"
        x1="120"
        y1="216"
        x2="180"
        y2="276"
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor="#f0b73f" />
        <Stop offset="1" stopColor="#d98f1f" />
      </LinearGradient>
    </Defs>

    <Rect x={40} y={60} width={220} height={46} rx={14} fill="#ffffff" />
    <Circle cx={66} cy={83} r={13} fill="#f0b73f" />
    <Text x={66} y={88} fontSize={12} fontWeight="700" fill="#ffffff" textAnchor="middle">
      1
    </Text>
    <Rect x={90} y={76} width={90} height={8} rx={4} fill="#e7e9f2" />
    <Rect x={220} y={76} width={30} height={8} rx={4} fill="#2c4bf0" />

    <Rect x={40} y={114} width={220} height={46} rx={14} fill="#14141f" />
    <Circle cx={66} cy={137} r={13} fill="#8b90a3" />
    <Text x={66} y={142} fontSize={12} fontWeight="700" fill="#0d0f18" textAnchor="middle">
      2
    </Text>
    <Rect x={90} y={130} width={90} height={8} rx={4} fill="#2a2b38" />
    <Rect x={220} y={130} width={30} height={8} rx={4} fill="#3f63ff" />

    <Rect x={40} y={168} width={220} height={46} rx={14} fill="#14141f" />
    <Circle cx={66} cy={191} r={13} fill="#8b6a3a" />
    <Text x={66} y={196} fontSize={12} fontWeight="700" fill="#ffffff" textAnchor="middle">
      3
    </Text>
    <Rect x={90} y={184} width={90} height={8} rx={4} fill="#2a2b38" />
    <Rect x={220} y={184} width={30} height={8} rx={4} fill="#3f63ff" />

    <G transform="translate(150 246)">
      <Circle r={30} fill="url(#medalGrad)" />
      <Path
        d="M0.8 -10.6 l4.8 9.9 10.8 1.3 -7.8 7.6 2 11 -9.8-5.1 -9.8 5.1 2-11 -7.8-7.6 10.8-1.3z"
        fill="#ffffff"
        fillOpacity={0.95}
      />
    </G>
  </Svg>
);

export const ONBOARDING_ILLUSTRATIONS = [
  DiscoverIllustration,
  CompeteIllustration,
  AchieveIllustration,
] as const;

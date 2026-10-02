import type { ImageSourcePropType } from "react-native";

export type TrackingStage = "weak" | "active" | "stable" | "strong" | "great" | "maxed";

export interface TrackingStageInfo {
  label: string;
  title: string;
  subtitle: string;
  accentColor: string;
  icon?: ImageSourcePropType;
  showButton: boolean;
}

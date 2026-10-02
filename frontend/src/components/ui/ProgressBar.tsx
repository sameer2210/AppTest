import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { cn } from "@/utils/cn";

type Props = {
  progress: number;
  className?: string;
  trackClassName?: string;
};

const ProgressBar = ({ progress, className, trackClassName }: Props) => {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      className={cn(
        "h-[6px] w-full overflow-hidden rounded-[17px] bg-background-muted",
        trackClassName,
      )}
    >
      <LinearGradient
        colors={["#003DCF", "#4E92FF"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: `${clamped * 100}%`, height: "100%", borderRadius: 17 }}
      />
    </View>
  );
};

export default ProgressBar;

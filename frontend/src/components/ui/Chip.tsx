import PressableScale from "./PressableScale";
import CustomText from "@/components/CustomText";
import { cn } from "@/utils/cn";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  /** Figma: All=14px, Take Actions/Feed=12px */
  compact?: boolean;
};

const Chip = ({ label, selected = false, onPress, className, compact = false }: Props) => (
  <PressableScale
    onPress={onPress}
    className={cn(
      "h-6 items-center justify-center rounded-pill px-3",
      selected ? "bg-background-white" : "border border-border-white bg-transparent",
      className,
    )}
  >
    <CustomText
      className={cn(
        "font-body",
        compact ? "text-xs" : "text-sm",
        selected ? "text-text-dark" : "text-text-primary",
      )}
    >
      {label}
    </CustomText>
  </PressableScale>
);

export default Chip;

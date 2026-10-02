import { ActivityIndicator } from "react-native";
import CustomText from "@/components/CustomText";
import PressableScale from "./PressableScale";
import { cn } from "@/utils/cn";

type Variant = "primary" | "white" | "outline";
type Size = "default" | "pill" | "compact";

type Props = {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  labelClassName?: string;
  onPress?: () => void;
  disabled?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary: "bg-brand-blue",
  white: "bg-background-white",
  outline: "border border-border-white bg-transparent",
};

const sizeClass: Record<Size, string> = {
  default: "min-h-[32px] px-4 rounded-pill",
  pill: "min-h-[32px] px-4 rounded-pill",
  compact: "min-h-[24px] px-3 rounded-pill",
};

const labelVariantClass: Record<Variant, string> = {
  primary: "text-text-primary",
  white: "text-text-dark",
  outline: "text-text-primary",
};

const labelSizeClass: Record<Size, string> = {
  default: "text-sm",
  pill: "text-sm",
  compact: "text-xs",
};

const Button = ({
  label,
  variant = "primary",
  size = "pill",
  loading,
  fullWidth,
  className,
  labelClassName,
  onPress,
  disabled,
}: Props) => (
  <PressableScale
    accessibilityRole="button"
    disabled={disabled || loading}
    onPress={onPress}
    className={cn(
      "items-center justify-center",
      variantClass[variant],
      sizeClass[size],
      fullWidth && "w-full",
      (disabled || loading) && "opacity-50",
      className,
    )}
  >
    {loading ? (
      <ActivityIndicator color={variant === "white" ? "#000" : "#FFF"} />
    ) : (
      <CustomText
        className={cn(
          "font-body text-center",
          labelVariantClass[variant],
          labelSizeClass[size],
          labelClassName,
        )}
      >
        {label}
      </CustomText>
    )}
  </PressableScale>
);

export default Button;

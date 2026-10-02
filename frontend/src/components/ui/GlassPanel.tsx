import { type ViewProps } from "react-native";
import GlassSurface from "./GlassSurface";
import { cn } from "@/utils/cn";

type Props = ViewProps & {
  className?: string;
  borderRadius?: number;
  intensity?: number;
  shine?: boolean;
};

/** Glassmorphism panel — blur, dark tint, light border shine. Reuse on toggles and link fields. */
const GlassPanel = ({
  className,
  borderRadius = 16,
  intensity,
  shine = true,
  children,
  ...props
}: Props) => (
  <GlassSurface
    borderRadius={borderRadius}
    intensity={intensity}
    shine={shine}
    className={cn(className)}
    {...props}
  >
    {children}
  </GlassSurface>
);

export default GlassPanel;

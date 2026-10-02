import React, { memo } from "react";
import { View } from "react-native";

export type CornerBracketProps = {
  position: "tl" | "tr" | "bl" | "br";
};

/** Rounded Corner Brackets matching design ┌ ┐ └ ┘ */
export const CornerBracket: React.FC<CornerBracketProps> = memo(({ position }) => {
  const size = 36;
  const radius = 10;
  const strokeWidth = 3.5;
  const color = "#1A1A1A";

  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");

  return (
    <View
      style={{
        position: "absolute",
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        left: isLeft ? 0 : undefined,
        right: !isLeft ? 0 : undefined,
        width: size,
        height: size,
        borderColor: color,
        borderTopWidth: isTop ? strokeWidth : 0,
        borderBottomWidth: !isTop ? strokeWidth : 0,
        borderLeftWidth: isLeft ? strokeWidth : 0,
        borderRightWidth: !isLeft ? strokeWidth : 0,
        borderTopLeftRadius: isTop && isLeft ? radius : 0,
        borderTopRightRadius: isTop && !isLeft ? radius : 0,
        borderBottomLeftRadius: !isTop && isLeft ? radius : 0,
        borderBottomRightRadius: !isTop && !isLeft ? radius : 0,
      }}
    />
  );
});

CornerBracket.displayName = "CornerBracket";

export default CornerBracket;

import { AntDesign, Entypo, Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { logWarn } from "../config/devLogger";

export type IconType = "ant-design" | "entypo" | "feather" | "fontawesome" | "material-icons";

interface VectorIconCustomProps {
  iconType: IconType;
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle | ViewStyle>;
  [key: string]: any;
}

const VectorIconCustom: React.FC<VectorIconCustomProps> = ({
  iconType,
  name,
  size = 20,
  color,
  style,
  ...otherProps
}) => {
  const iconProps = {
    name: name as React.ComponentProps<typeof MaterialIcons>["name"],
    size,
    color,
    style,
    ...otherProps,
  };

  switch (iconType) {
    case "ant-design":
      return <AntDesign {...(iconProps as React.ComponentProps<typeof AntDesign>)} />;
    case "entypo":
      return <Entypo {...(iconProps as React.ComponentProps<typeof Entypo>)} />;
    case "feather":
      return <Feather {...(iconProps as React.ComponentProps<typeof Feather>)} />;
    case "fontawesome":
      return <FontAwesome {...(iconProps as React.ComponentProps<typeof FontAwesome>)} />;
    case "material-icons":
      return <MaterialIcons {...(iconProps as React.ComponentProps<typeof MaterialIcons>)} />;
    default:
      logWarn(`Unknown icon type: ${iconType}. Using Entypo as fallback.`);
      return <Entypo {...(iconProps as React.ComponentProps<typeof Entypo>)} />;
  }
};

export default VectorIconCustom;

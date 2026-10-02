export type BottomTabBarComponentProps = {
  state: {
    index: number;
    routes: { name: string; key: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
  };
};

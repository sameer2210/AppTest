import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import BottomTabBarV2 from "../../../src/navigation/bottomNavigator/BottomTabBarV2";
import { AnimatedTabBackground } from "../../../src/components/ui";

const TabsLayout = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedTabBackground />
      <Tabs
        initialRouteName="index"
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          animation: "fade",
          sceneStyle: { backgroundColor: "transparent" },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
        tabBar={(props) => <BottomTabBarV2 {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="explore" options={{ title: "Explore" }} />
        <Tabs.Screen name="kingdom" options={{ title: "Rewards", href: null }} />
        <Tabs.Screen name="activity" options={{ title: "Tickets" }} />
        <Tabs.Screen name="plan" options={{ title: "Business" }} />
        <Tabs.Screen name="events" options={{ href: null, title: "Events" }} />
        <Tabs.Screen
          name="organize-create"
          options={{
            href: null,
            title: "Organize",
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen name="profile" options={{ href: null, title: "Profile" }} />
      </Tabs>
    </View>
  );
};

export default TabsLayout;

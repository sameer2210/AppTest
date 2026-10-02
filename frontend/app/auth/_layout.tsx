import { Stack } from "expo-router";

const AuthLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
      }}
    />
  );
};

export default AuthLayout;

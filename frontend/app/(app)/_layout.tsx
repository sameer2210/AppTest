import { Stack } from "expo-router";
import { BRAND } from "@/constants/stron";
import { colors } from "@/utils/colors";

const AppGroupLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonMenuEnabled: false,
        animation: "fade_from_bottom",
        animationDuration: 220,
        contentStyle: { backgroundColor: BRAND.backgroundDark },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen
        name="notifications"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen
        name="gym-edit-profile"
        options={{ contentStyle: { backgroundColor: colors.screenBgDark } }}
      />
      <Stack.Screen
        name="gym-onboarding"
        options={{ contentStyle: { backgroundColor: colors.screenBgDark } }}
      />
      <Stack.Screen name="bank-details" />
      <Stack.Screen name="profile-completion" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="event-rewards" />
      <Stack.Screen name="google-fit-stats" />
      <Stack.Screen name="featured-events" />
      <Stack.Screen name="search-results" />
      <Stack.Screen
        name="event-details"
        options={{ contentStyle: { backgroundColor: colors.screenBgEventDetails } }}
      />
      <Stack.Screen
        name="create-marathon"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="create-step-challenge"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="create-king-of-the-hill"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="create-face-off"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="external-listing"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="event-published"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="organizer-preview" />
      <Stack.Screen name="organize-leaderboard" />
      <Stack.Screen name="event-settlement" />
      <Stack.Screen
        name="event-dashboard"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="participant-detail" />
      <Stack.Screen
        name="stron-event"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="review-payment"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="payment-success"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="policy-webview" />
      <Stack.Screen
        name="face-off-details"
        options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }}
      />
      <Stack.Screen
        name="connect-with-stron"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen
        name="check-in-selection"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="step-race" />
      <Stack.Screen name="ongoing-step-race" />
      <Stack.Screen name="completed-step-race" />
      <Stack.Screen
        name="my-races"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="ongoing-battle" />
      <Stack.Screen name="coupons" options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }} />
      <Stack.Screen
        name="create-coupon"
        options={{ contentStyle: { backgroundColor: colors.screenBgNavy } }}
      />
      <Stack.Screen name="stron-pro" options={{ contentStyle: { backgroundColor: colors.screenBgNavy } }} />
      <Stack.Screen name="listings" options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }} />
      <Stack.Screen name="create-plan" options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }} />
      <Stack.Screen
        name="plan-published"
        options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }}
      />
      <Stack.Screen
        name="plan-preview"
        options={{ contentStyle: { backgroundColor: colors.screenBgDark } }}
      />
      <Stack.Screen
        name="manual-payments"
        options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }}
      />
      <Stack.Screen
        name="manual-payment-detail"
        options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }}
      />
      <Stack.Screen name="gym-payout" options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }} />
      <Stack.Screen name="gym-members" options={{ contentStyle: { backgroundColor: colors.screenBgDark } }} />
      <Stack.Screen
        name="gym-analytics"
        options={{ contentStyle: { backgroundColor: colors.screenBgDark } }}
      />
      <Stack.Screen
        name="listing-analytics"
        options={{ contentStyle: { backgroundColor: colors.screenBgDark } }}
      />
      <Stack.Screen
        name="active-customers"
        options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }}
      />
      <Stack.Screen name="business-plan" />
      <Stack.Screen
        name="my-plans"
        options={{ contentStyle: { backgroundColor: colors.transparent } }}
      />
      <Stack.Screen name="plan-detail" options={{ contentStyle: { backgroundColor: colors.screenBgBlack } }} />
    </Stack>
  );
};

export default AppGroupLayout;

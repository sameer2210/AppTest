/**
 * Forces Razorpay CheckoutActivity to use an opaque full-screen white theme so
 * the React Native event screen does not show through at the bottom on Android.
 */
const { withAndroidManifest, withAndroidStyles } = require("@expo/config-plugins");

const CHECKOUT_ACTIVITY = "com.razorpay.CheckoutActivity";
const CHECKOUT_THEME = "Theme.RazorpayCheckout.Fullscreen";

const withRazorpayCheckoutTheme = (config) => {
  config = withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style ?? [];
    const exists = styles.some((s) => s.$?.name === CHECKOUT_THEME);
    if (!exists) {
      styles.push({
        $: {
          name: CHECKOUT_THEME,
          parent: "Theme.AppCompat.Light.NoActionBar",
        },
        item: [
          { $: { name: "android:windowFullscreen" }, _: "true" },
          { $: { name: "android:windowIsTranslucent" }, _: "false" },
          { $: { name: "android:windowBackground" }, _: "@android:color/white" },
          { $: { name: "android:statusBarColor" }, _: "@android:color/white" },
          { $: { name: "android:navigationBarColor" }, _: "@android:color/white" },
          { $: { name: "android:windowLightStatusBar" }, _: "true" },
          { $: { name: "android:windowLightNavigationBar" }, _: "true" },
        ],
      });
    }
    cfg.modResults.resources.style = styles;
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    app.activity = app.activity ?? [];
    const idx = app.activity.findIndex((a) => a.$?.["android:name"] === CHECKOUT_ACTIVITY);
    const checkoutActivity = {
      $: {
        "android:name": CHECKOUT_ACTIVITY,
        "android:theme": `@style/${CHECKOUT_THEME}`,
        "tools:replace": "android:theme",
      },
    };

    if (idx >= 0) {
      app.activity[idx] = checkoutActivity;
    } else {
      app.activity.push(checkoutActivity);
    }

    return cfg;
  });

  return config;
};

module.exports = withRazorpayCheckoutTheme;

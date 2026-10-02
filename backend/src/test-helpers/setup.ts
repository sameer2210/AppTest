// Test setup file for Vitest
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-32-chars-long!";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-jwt-secret-key-32-chars-long!";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret";
process.env.REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY || "sk_test_dummy_revenuecat";
process.env.REVENUECAT_WEBHOOK_AUTH_KEY =
  process.env.REVENUECAT_WEBHOOK_AUTH_KEY || "rc_webhook_test_token";
process.env.REVENUECAT_ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || "stron_pro";
process.env.REVENUECAT_STRON_PRO_OFFERING_REST_ID =
  process.env.REVENUECAT_STRON_PRO_OFFERING_REST_ID || "ofrngaddee2e514";

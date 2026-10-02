// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const activeOpacityRestrictedSyntax = {
  selector:
    "JSXAttribute[name.name='activeOpacity'] > JSXExpressionContainer > Literal[value!=0.7][value!=1]",
  message:
    "TouchableOpacity must use activeOpacity={0.7} (or 1 for disabled/backdrop). See .cursor/rules/active-opacity.mdc.",
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", activeOpacityRestrictedSyntax],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/components/CustomText.tsx",
      "src/utils/typography.ts",
      "src/components/ui/**",
      "src/navigation/bottomNavigator/BottomTabBarV2.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Text"],
              message:
                "Use CustomText from src/components/CustomText.tsx instead of react-native Text.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        activeOpacityRestrictedSyntax,
        {
          selector: "Property[key.name='fontSize'][value.type='Literal']",
          message:
            "Use fontTextStyles or headingTextStyles presets from src/utils/typography.ts. No raw fontSize numbers.",
        },
        {
          selector: "Property[key.name='fontFamily']",
          message:
            "Use fontTextStyles or headingTextStyles presets from src/utils/typography.ts. No raw fontFamily.",
        },
        {
          selector: "Property[key.name='fontWeight'][value.type='Literal']",
          message:
            "Use fontTextStyles or headingTextStyles presets from src/utils/typography.ts. No raw fontWeight.",
        },
        {
          selector: "Property[key.name='lineHeight'][value.type='Literal']",
          message:
            "Use fontTextStyles or headingTextStyles presets from src/utils/typography.ts. No raw lineHeight.",
        },
        {
          selector: "Property[key.name='letterSpacing'][value.type='Literal']",
          message:
            "Use fontTextStyles or headingTextStyles presets from src/utils/typography.ts. No raw letterSpacing.",
        },
      ],
    },
  },
  {
    files: ["src/features/**/ui/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/services/*", "@/services/**"],
              message:
                "Feature UI must use @/features/* public APIs instead of @/services/* (FSD).",
            },
            {
              group: ["@/screens/stron/*"],
              message:
                "Feature UI must not import legacy screens. Use @/features/<name> public API (FSD).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: [
      "src/components/CustomText.tsx",
      "src/components/ui/**",
      "src/components/EventFormatBanner.tsx",
      "src/components/StronBackHeader.tsx",
      "src/components/NetworkState.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Text"],
              message:
                "Use CustomText from src/components/CustomText.tsx instead of react-native Text.",
            },
          ],
          patterns: [
            {
              group: ["@/services/*", "@/services/**"],
              message:
                "Components must use @/features/* public APIs instead of @/services/* (FSD).",
            },
            {
              group: ["@/features/*/api/*", "@/features/*/model/*", "@/features/*/ui/*"],
              message:
                "Import from the feature public barrel @/features/<name> instead of deep feature paths (FSD).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/model/**/*.{ts,tsx}", "src/features/**/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/features/**/ui/*", "@/features/**/ui"],
              message: "Feature model/api layers must not import UI (FSD).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "error",
    },
  },
  {
    files: [
      "*.config.js",
      "plugins/**/*.js",
      "eslint.config.js",
      "src/provider/*Lazy.ts",
      "src/store/getAppStore.ts",
      "src/utils/images.ts",
      "src/theme/figma-tokens.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

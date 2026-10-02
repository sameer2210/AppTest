# Figma → Stron React Native (MCP Integration Rules)

Use when implementing designs from [Figma MCP](https://www.figma.com/design/) into **Stron-App_ReactNative**.

---

## 1. Token Definitions

| Layer         | Path                                              |
| ------------- | ------------------------------------------------- |
| Source (Node) | `src/theme/figma-tokens.js`                       |
| TypeScript    | `src/theme/figma-tokens.ts`, `src/theme/index.ts` |
| Gradients     | `src/theme/gradients.ts`                          |
| Tailwind      | `tailwind.config.js`                              |

```js
colors.gradient.stepRace = ["#1B5FFF", "#086CFF", "#0038C8", "#001540", "#000000"];
fontSize = { "display-lg": 40, "title-md": 20, "body-md": 16 };
fontFamily.body = ["Barlow-Regular"];
```

**Usage:**

```tsx
<ScreenGradientBackground variant="stepRace" />
<Text className="font-body text-display-lg" />
<View className="rounded-pill bg-brand-blue" />
```

No automated token pipeline — update `figma-tokens.js` from Figma Dev Mode.

---

## 2. Component Library

| Layer        | Path                                              |
| ------------ | ------------------------------------------------- |
| Primitives   | `src/components/ui/`                              |
| Screen UI    | `src/screens/stron/<feature>/v2/components/`      |
| Screen logic | `src/screens/stron/<feature>/<Feature>Screen.tsx` |

**Reusable v2 primitives:**

- `ScreenGradientBackground` — full-screen gradients
- `GlassPanel` — blur + border shine (toggles, link fields)
- `Text`, `Button`, `PressableScale`, `Chip`, `ProgressBar`

**Step Race components** (`node 1:3216`):

- `StepRaceTopToggle`, `StepRaceHeader`, `StepRaceQrCode`, `StepRaceStatusButton`, `StepRaceLinkField`

---

## 3. Frameworks & Libraries

- React Native 0.81 + Expo 54 + Expo Router
- NativeWind 4 + Tailwind 3
- `expo-linear-gradient`, `expo-blur`, `react-native-qrcode-svg`
- Redux Toolkit, Metro (`withNativeWind`)

---

## 4. Asset Management

All assets via `src/utils/images.ts`:

```ts
STEP_RACE: {
  COPY: require("../../assets/images/step-race/copy.png"),
}
```

Figma MCP: `download_assets` → `assets/images/<feature>/` → register in `images.ts`.

---

## 5. Icon System

- Raster: `assets/images/<feature>/`
- Vector: `@expo/vector-icons`
- Naming: `STEP_RACE.COPY`, `HOME_V2.ICON_STEPS`

---

## 6. Styling Approach

- NativeWind `className` + `cn()` (`src/utils/cn.ts`)
- Global font: Barlow (`font-body`, `global.css` base layer)
- Figma Helvetica Neue → map to Barlow; match px sizes from Dev Mode
- `StyleSheet` only for `absoluteFill`, blur layers

**Glass pattern:**

```tsx
<GlassPanel borderRadius={16} className="h-[58px]">
  {children}
</GlassPanel>
```

---

## 7. Project Structure

```
app/(app)/step-race.tsx
src/screens/stron/stepRace/
  StepRaceScreen.tsx
  v2/StepRaceScreenContent.tsx
  v2/components/*.tsx
src/navigation/href.ts → href.app.stepRace
```

---

## 8. Figma MCP Checklist

1. Extract `fileKey` + `nodeId` from URL (`1-3216` → `1:3216`)
2. `get_design_context` + `get_screenshot`
3. Add tokens to `figma-tokens.js` if new colors/sizes
4. Use `ScreenGradientBackground` + `GlassPanel` + typography tokens
5. `download_assets` for icons
6. Wire navigation; QR in placeholder nodes

**Reference:** [Step Race — node 1:3216](https://www.figma.com/design/smH3pSTAhiau4vvjRTffYh/Untitled?node-id=1-3216&m=dev)

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ListingType, StronEvent } from "@/models/stronManaged/event";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";

export type EventBannerFormat = StronEvent["format"];

type LogoLayout = {
  /** Intrinsic width / height of the template asset. */
  aspect: number;
  /** Logo center X as fraction of template width. */
  cx: number;
  /** Logo center Y as fraction of template height. */
  cy: number;
  /** Logo diameter as fraction of template width (fills inside glow ring). */
  diameter: number;
  /** Solid fill when no logo (hides baked-in "YOUR LOGO HERE"). */
  blankFill: string;
};

/** Template pixel grid (assets/*.png). Keep hero containers on this ratio. */
export const EVENT_BANNER_TEMPLATE_ASPECT = 332 / 187;

/**
 * Logo circle as fractions of each template pixel grid (assets/*.png @ 332×187).
 * New banners have no baked-in ring — logo/upload sits on the right when present.
 */
/** Logo disk — Figma explore cards (1423:72): white circle on banner right. */
const LOGO_LAYOUT: Record<string, LogoLayout> = {
  virtual_step_challenge: {
    aspect: EVENT_BANNER_TEMPLATE_ASPECT,
    cx: 0.8,
    cy: 0.48,
    diameter: 0.24,
    blankFill: "#FFFFFF",
  },
  marathon: {
    aspect: EVENT_BANNER_TEMPLATE_ASPECT,
    cx: 0.8,
    cy: 0.48,
    diameter: 0.24,
    blankFill: "#FFFFFF",
  },
  king_of_the_hill: {
    aspect: EVENT_BANNER_TEMPLATE_ASPECT,
    cx: 0.8,
    cy: 0.48,
    diameter: 0.24,
    blankFill: "#FFFFFF",
  },
  face_off: {
    aspect: EVENT_BANNER_TEMPLATE_ASPECT,
    cx: 0.8,
    cy: 0.48,
    diameter: 0.24,
    blankFill: "#FFFFFF",
  },
};

const DEFAULT_LAYOUT = LOGO_LAYOUT.virtual_step_challenge;

/** Accept API/format alias variants. */
export const normalizeEventBannerFormat = (
  format?: EventBannerFormat | string | null,
): string | null => {
  if (!format) return null;
  const key = String(format)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (key === "marathon" || key === "m") return "marathon";
  if (
    key === "virtual_step_challenge" ||
    key === "step_challenge" ||
    key === "sc" ||
    key === "stepchallenge"
  ) {
    return "virtual_step_challenge";
  }
  if (
    key === "king_of_the_hill" ||
    key === "koth" ||
    key === "king_of_hill" ||
    key === "kingofthehill"
  ) {
    return "king_of_the_hill";
  }
  if (key === "face_off" || key === "faceoff" || key === "face-off") return "face_off";
  return key;
};

/** Format-specific STRON event banner templates (logo circle on the right). */
export const getEventBannerTemplate = (
  format?: EventBannerFormat | string | null,
): ImageSourcePropType => {
  switch (normalizeEventBannerFormat(format)) {
    case "marathon":
      return images.EVENT_BANNER_TEMPLATES.MARATHON;
    case "virtual_step_challenge":
      return images.EVENT_BANNER_TEMPLATES.STEP_CHALLENGE;
    case "king_of_the_hill":
      return images.EVENT_BANNER_TEMPLATES.KING_OF_THE_HILL;
    case "face_off":
      return images.EVENT_BANNER_TEMPLATES.FACE_OFF;
    default:
      return images.EVENT_BANNER_TEMPLATES.STEP_CHALLENGE;
  }
};

export const hasEventBannerTemplate = (format?: EventBannerFormat | string | null) => {
  const key = normalizeEventBannerFormat(format);
  return (
    key === "marathon" ||
    key === "virtual_step_challenge" ||
    key === "king_of_the_hill" ||
    key === "face_off"
  );
};

/** External listings created before `listingType` existed are tagged in the description. */
const LEGACY_EXTERNAL_DESCRIPTION = /^External listing \(/i;

/**
 * Template + logo circle is for STRON-managed events only. Feeds that omit
 * `listingType` fall back to the backend default (`stron_managed`), so only
 * explicit self-managed / external listings opt out.
 */
export const shouldUseEventBannerTemplate = (
  format?: EventBannerFormat | string | null,
  listingType?: ListingType | string | null,
  description?: string | null,
) => {
  if (!hasEventBannerTemplate(format)) return false;
  if (listingType === "self_managed" || listingType === "external") return false;
  if (!listingType && description && LEGACY_EXTERNAL_DESCRIPTION.test(description)) return false;
  return true;
};

/**
 * Rectangle where the template image is painted under cover/contain, relative to the view.
 * Used so the logo circle tracks the visible image plane 1:1.
 */
const contentPlaneForMode = (
  viewW: number,
  viewH: number,
  imageAspect: number,
  mode: "cover" | "contain",
) => {
  const viewAspect = viewW / Math.max(viewH, 1);
  let contentW: number;
  let contentH: number;
  let offsetX: number;
  let offsetY: number;

  if (mode === "cover") {
    if (viewAspect > imageAspect) {
      contentW = viewW;
      contentH = viewW / imageAspect;
      offsetX = 0;
      offsetY = (viewH - contentH) / 2;
    } else {
      contentH = viewH;
      contentW = viewH * imageAspect;
      offsetX = (viewW - contentW) / 2;
      offsetY = 0;
    }
  } else if (viewAspect > imageAspect) {
    contentH = viewH;
    contentW = viewH * imageAspect;
    offsetX = (viewW - contentW) / 2;
    offsetY = 0;
  } else {
    contentW = viewW;
    contentH = viewW / imageAspect;
    offsetX = 0;
    offsetY = (viewH - contentH) / 2;
  }

  return { contentW, contentH, offsetX, offsetY };
};

type Props = {
  format?: EventBannerFormat | string | null;
  /** Organizer logo URL or storage key stored in `bannerName`. */
  logoUri?: string | null;
  /** Raw `bannerName` — resolved internally when `logoUri` is omitted. */
  bannerName?: string | null;
  className?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain";
  /**
   * Organizer create/edit/manage only. When true and no logo is set, show
   * "Upload Logo" in the circle. Never true for participants / Explore / Home.
   */
  showUploadPlaceholder?: boolean;
  /** Called when organizer taps the upload circle (only if showUploadPlaceholder). */
  onUploadPress?: () => void;
  /**
   * Explore cards (Figma 1423:72) — always paint the white logo disk, even
   * before an image loads. Other surfaces keep the previous hide-when-empty behavior.
   */
  alwaysShowLogoCircle?: boolean;
};

/**
 * STRON-managed event card banner: format template + organizer logo in the
 * right-side ring. Upload CTA only when `showUploadPlaceholder`; otherwise empty
 * solid circle covers template "YOUR LOGO HERE" for regular users.
 */
const EventFormatBanner = ({
  format,
  logoUri,
  bannerName,
  className,
  style,
  resizeMode = "cover",
  showUploadPlaceholder = false,
  onUploadPress,
  alwaysShowLogoCircle = false,
}: Props) => {
  const formatKey = normalizeEventBannerFormat(format) || "virtual_step_challenge";
  const layout = LOGO_LAYOUT[formatKey] || DEFAULT_LAYOUT;
  const template = getEventBannerTemplate(formatKey);

  const logoCandidate = logoUri?.trim() || bannerName?.trim() || "";
  const resolvedLogo = (() => {
    if (!logoCandidate) return null;
    if (/^(file:|content:|data:)/i.test(logoCandidate)) return logoCandidate;
    const remote = resolveEventBannerUri(logoCandidate);
    return remote || logoCandidate;
  })();

  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    setImageError(false);
  }, [resolvedLogo]);

  const showOrganizerUpload = showUploadPlaceholder === true && !resolvedLogo;

  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setViewSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const plane = useMemo(() => {
    if (!viewSize) return null;
    return contentPlaneForMode(viewSize.w, viewSize.h, layout.aspect, resizeMode);
  }, [viewSize, layout.aspect, resizeMode]);

  const logoFrame = useMemo(() => {
    if (!plane) return null;
    if (!resolvedLogo && !showOrganizerUpload && !alwaysShowLogoCircle) return null;
    const size = layout.diameter * plane.contentW;
    return {
      left: layout.cx * plane.contentW - size / 2,
      top: layout.cy * plane.contentH - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
    };
  }, [
    plane,
    layout.cx,
    layout.cy,
    layout.diameter,
    resolvedLogo,
    showOrganizerUpload,
    alwaysShowLogoCircle,
  ]);

  const circleBg = showOrganizerUpload && !resolvedLogo ? "#D9D9D9" : layout.blankFill;

  const circleBody = logoFrame ? (
    <>
      {resolvedLogo && !imageError ? (
        <Image
          source={{ uri: resolvedLogo }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : showOrganizerUpload ? (
        <View style={styles.uploadInner}>
          <Feather
            name="upload"
            size={Math.max(14, Math.round(logoFrame.width * 0.22))}
            color="#000000"
          />
          <CustomText
            style={[
              fontTextStyles.eightMediumBlack,
              {
                color: "#000000",
                marginTop: 2,
                textAlign: "center",
              },
            ]}
          >
            Upload Logo
          </CustomText>
        </View>
      ) : (
        <Image
          source={images.LOADING_LOGO}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
    </>
  ) : null;

  return (
    <View
      collapsable={false}
      className={className}
      style={[styles.root, style]}
      onLayout={onLayout}
    >
      {/*
        Android often ignores resizeMode when Image only has absolute edges.
        Explicit measured width/height makes cover/contain fill the block reliably.
      */}
      {viewSize ? (
        <Image
          source={template}
          style={{ width: viewSize.w, height: viewSize.h }}
          resizeMode={resizeMode}
        />
      ) : null}

      {plane && logoFrame ? (
        <View
          style={{
            position: "absolute",
            left: plane.offsetX,
            top: plane.offsetY,
            width: plane.contentW,
            height: plane.contentH,
          }}
          pointerEvents={showOrganizerUpload && onUploadPress ? "box-none" : "none"}
        >
          {showOrganizerUpload && onUploadPress ? (
            <Pressable
              onPress={onUploadPress}
              accessibilityRole="button"
              accessibilityLabel="Upload Logo"
              style={[styles.logoCircle, logoFrame, { backgroundColor: circleBg }]}
            >
              {circleBody}
            </Pressable>
          ) : (
            <View
              style={[styles.logoCircle, logoFrame, { backgroundColor: circleBg }]}
              pointerEvents="none"
            >
              {circleBody}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    backgroundColor: "#1A2940",
    width: "100%",
    height: "100%",
  },
  logoCircle: {
    position: "absolute",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  defaultLogoImg: {
    width: "65%",
    height: "65%",
  },
});

export default EventFormatBanner;

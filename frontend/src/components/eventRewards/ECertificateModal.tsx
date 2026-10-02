import { useEffect, useRef } from "react";
import {
  Image,
  Modal,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { formatKingClock } from "@/utils/rewards.utils";
import { shareCapturedView } from "@/utils/shareRewardVisual";
import { captureEvent } from "@/analytics/posthog/events";

const FIGMA_W = 992;
const FIGMA_H = 771;

type Props = {
  visible: boolean;
  recipientName: string;
  eventName?: string;
  /** @deprecated Prefer eventName — kept for Kingdom legacy enrollments. */
  planLabel?: string | null;
  organizerName?: string | null;
  formatLabel?: string | null;
  rank?: number | null;
  /** Secondary stat line under format (e.g. TIME TO FINISH 02h 38m) */
  resultLine?: string | null;
  /** Rank / days / steps shown in the blue pill (Figma 465:2854). */
  pillParts?: string[];
  onClose: () => void;
};

const typeStyle = (
  size: number,
  color: string,
  extra?: TextStyle,
): StyleProp<CustomTextStyle> => ({
  fontSize: size,
  color,
  includeFontPadding: false,
  allowFontScaling: false,
  ...extra,
});

/**
 * STRON Certificate of Achievement — Figma 465:2854 (992×771), scaled to device width.
 */
const ECertificateModal = ({
  visible,
  recipientName,
  eventName,
  planLabel,
  organizerName,
  formatLabel,
  rank,
  resultLine,
  pillParts,
  onClose,
}: Props) => {
  const cardRef = useRef<View>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const cardW = Math.max(280, Math.min(screenW - 24, 520));
  const cardH = cardW * (FIGMA_H / FIGMA_W);
  const scale = cardW / FIGMA_W;
  const s = (n: number) => n * scale;

  useEffect(() => {
    if (visible) {
      captureEvent("ecertificate_viewed", { event_key: eventName || undefined });
    }
  }, [visible, eventName]);

  const organizer = organizerName?.trim() || "STRON";
  const format = (formatLabel || "EVENT").toUpperCase();
  const name = (recipientName || "Athlete").toUpperCase();
  const eventTitle = (eventName || planLabel || "STRON Event").toUpperCase();

  const stats = (pillParts && pillParts.length > 0
    ? pillParts
    : [
        rank != null ? `RANK #${rank}` : null,
        resultLine?.trim() || null,
      ].filter((part): part is string => Boolean(part)));

  const shareCertificate = async () => {
    await shareCapturedView({
      viewRef: cardRef,
      dialogTitle: "Share certificate",
      fallbackMessage: `I earned a STRON certificate for ${eventName || planLabel || "my event"}!`,
    });
  };

  const maxCardH = screenH * 0.62;
  const fit = cardH > maxCardH ? maxCardH / cardH : 1;
  const canvasW = cardW * fit;
  const canvasH = cardH * fit;
  const fs = (n: number) => s(n) * fit;
  const abs = (left: number, top: number, extra?: ViewStyle): ViewStyle => ({
    position: "absolute",
    left: fs(left),
    top: fs(top),
    ...extra,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          paddingHorizontal: 12,
          paddingVertical: 24,
        }}
      >
        <View style={{ width: canvasW, alignSelf: "center" }}>
          <View
            ref={cardRef}
            collapsable={false}
            style={{
              width: canvasW,
              height: canvasH,
              backgroundColor: "#FFFFFF",
              borderRadius: fs(34),
              overflow: "hidden",
            }}
          >
            {/* Figma 465:2870 — user corner PNG (no LinearGradient). Blur matches Figma 50px. */}
            <Image
              pointerEvents="none"
              source={images.REWARDS.CERTIFICATE_CORNER}
              resizeMode="cover"
              blurRadius={Math.max(12, fs(50))}
              style={{
                position: "absolute",
                left: fs(769),
                top: fs(555),
                width: fs(319),
                height: fs(309),
                borderRadius: fs(22),
                opacity: 1,
              }}
            />

            <Image
              source={images.REWARDS.CERTIFICATE_LOGO}
              style={{
                position: "absolute",
                left: fs(49),
                top: fs(78),
                width: fs(76),
                height: fs(76),
                borderRadius: fs(88),
              }}
            />
            <CustomText
              style={[
                abs(49, 168),
                typeStyle(fs(16), "#000000", {
                  width: fs(76),
                  textAlign: "center",
                }),
              ]}
            >
              STRON
            </CustomText>

            <CustomText
              style={typeStyle(fs(64), "#000000", {
                position: "absolute",
                top: fs(76),
                left: 0,
                right: 0,
                textAlign: "center",
              })}
            >
              CERTIFICATE
            </CustomText>
            <View
              style={{
                position: "absolute",
                top: fs(169),
                left: 0,
                right: 0,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ width: fs(87), height: 1, backgroundColor: "#2A86FF" }} />
              <CustomText
                style={typeStyle(fs(24), "#2A86FF", { marginHorizontal: fs(12) })}
              >
                OF ACHIEVEMENT
              </CustomText>
              <View style={{ width: fs(87), height: 1, backgroundColor: "#2A86FF" }} />
            </View>
            <CustomText
              style={typeStyle(fs(24), "#000000", {
                position: "absolute",
                top: fs(206),
                left: 0,
                right: 0,
                textAlign: "center",
              })}
            >
              PROUDLY PRESENTED TO
            </CustomText>

            <View
              style={{
                position: "absolute",
                left: fs(839),
                top: fs(63),
                width: fs(80),
                height: fs(80),
                borderRadius: fs(40),
                backgroundColor: "#D9D9D9",
              }}
            />
            <CustomText
              style={[
                abs(800, 150),
                typeStyle(fs(16), "#000000", { width: fs(160), textAlign: "center" }),
              ]}
            >
              Organized by
            </CustomText>
            <CustomText
              numberOfLines={1}
              style={[
                abs(800, 171),
                typeStyle(fs(16), "#2A80FF", { width: fs(160), textAlign: "center" }),
              ]}
            >
              {organizer}
            </CustomText>

            <CustomText
              numberOfLines={1}
              style={typeStyle(fs(64), "#000000", {
                position: "absolute",
                top: fs(267),
                left: fs(40),
                right: fs(40),
                textAlign: "center",
              })}
            >
              {name}
            </CustomText>
            <View
              style={{
                position: "absolute",
                top: fs(343),
                left: fs(237),
                width: fs(251),
                height: 1,
                backgroundColor: "#2A80FF",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: fs(343),
                left: fs(505),
                width: fs(251),
                height: 1,
                backgroundColor: "#2A80FF",
              }}
            />

            <CustomText
              style={typeStyle(fs(16), "#000000", {
                position: "absolute",
                top: fs(392),
                left: 0,
                right: 0,
                textAlign: "center",
              })}
            >
              For Successfully Participating In
            </CustomText>
            <CustomText
              numberOfLines={2}
              style={typeStyle(fs(48), "#2A80FF", {
                position: "absolute",
                top: fs(412),
                left: fs(24),
                right: fs(24),
                textAlign: "center",
              })}
            >
              {eventTitle}
            </CustomText>

            <View
              style={{
                position: "absolute",
                top: fs(485),
                left: (canvasW - fs(491)) / 2,
                width: fs(491),
                height: fs(70),
                borderRadius: fs(70),
                backgroundColor: "#2A80FF",
                overflow: "hidden",
              }}
            >
              <CustomText
                style={typeStyle(fs(20), "#FFFFFF", {
                  position: "absolute",
                  top: fs(11),
                  left: 0,
                  right: 0,
                  textAlign: "center",
                })}
              >
                {format}
              </CustomText>
              {stats.length > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: fs(38),
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {stats.map((part, index) => (
                    <View key={`${part}-${index}`} style={{ flexDirection: "row", alignItems: "center" }}>
                      {index > 0 ? (
                        <View
                          style={{
                            width: fs(6),
                            height: fs(6),
                            borderRadius: fs(3),
                            backgroundColor: "#FFFFFF",
                            marginHorizontal: fs(8),
                          }}
                        />
                      ) : null}
                      <CustomText style={typeStyle(fs(16), "#FFFFFF")}>
                        {part}
                      </CustomText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Image
              source={images.REWARDS.SIGNATURE}
              style={{
                position: "absolute",
                left: fs(50),
                top: fs(605),
                width: fs(186),
                height: fs(124),
              }}
              resizeMode="contain"
            />
            <View
              style={{
                position: "absolute",
                left: fs(57),
                top: fs(707),
                width: fs(171),
                height: 1,
                backgroundColor: "#000000",
              }}
            />
            <CustomText
              style={[abs(60, 715), typeStyle(fs(12), "#000000")]}
            >
              AUTHORIZED SIGNATURE
            </CustomText>

            <CustomText
              style={typeStyle(fs(36), "#000000", {
                position: "absolute",
                top: fs(653),
                left: 0,
                right: 0,
                textAlign: "center",
              })}
            >
              STRON
            </CustomText>
            <CustomText
              style={typeStyle(fs(16), "#000000", {
                position: "absolute",
                top: fs(705),
                left: 0,
                right: 0,
                textAlign: "center",
              })}
            >
              YOUR FITNESS . YOUR BATTLE
            </CustomText>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <PressableScale
              onPress={() => void shareCertificate()}
            >
              <CustomText>Download</CustomText>
            </PressableScale>
            <PressableScale
              onPress={() => void shareCertificate()}
            >
              <CustomText>Share</CustomText>
            </PressableScale>
          </View>

          <PressableScale
            onPress={onClose}
          >
            <CustomText>Close</CustomText>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
};

export const buildCertificateResultLine = (input: {
  format?: string | null;
  stats?: {
    finishTimeSeconds?: number | null;
    kingTimeSeconds?: number | null;
    totalWins?: number | null;
    successfulDays?: number | null;
    requiredDays?: number | null;
    totalSteps?: number | null;
  } | null;
}): string | null => {
  const format = input.format || "";
  const stats = input.stats || {};
  if (format === "king_of_the_hill") {
    return `KING TIME ${formatKingClock(stats.kingTimeSeconds)}`;
  }
  if (format === "face_off") {
    return `TOTAL WINS ${Math.round(stats.totalWins || 0)}`;
  }
  if (format === "virtual_step_challenge") {
    const req = stats.requiredDays || 0;
    return `SUCCESSFUL DAYS ${Math.round(stats.successfulDays || 0)}${req ? `/${req}` : ""}`;
  }
  if (stats.finishTimeSeconds != null) {
    return `TIME TO FINISH ${formatKingClock(stats.finishTimeSeconds)}`;
  }
  if (stats.totalSteps != null) {
    return `TOTAL STEPS ${Math.round(stats.totalSteps).toLocaleString("en-IN")}`;
  }
  return null;
};

export const formatLabelFromKey = (format?: string | null) => {
  if (format === "king_of_the_hill") return "King of the Hill";
  if (format === "face_off") return "Face - Off";
  if (format === "virtual_step_challenge") return "Step Challenge";
  if (format === "marathon") return "Marathon";
  return "Event";
};

export default ECertificateModal;

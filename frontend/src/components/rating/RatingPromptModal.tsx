import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Rate from "react-native-rate";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { logError } from "@/config/devLogger";
import { markRatingPromptDismissed } from "@/utils/ratingPromptStorage";
import { openReviewInStore, rateBoxOptions } from "@/utils/appRating";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";

type RatingPromptStep = "enjoying" | "feedbackForm";

export type RatingFeedbackPayload = {
  userId: string;
  isLiked: boolean;
  rating?: number;
  feedback?: string;
  tags?: string[];
};

type RatingPromptModalProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  /** Optional initial step for direct preview/testing */
  initialStep?: RatingPromptStep;
  onSubmitFeedback?: (payload: RatingFeedbackPayload) => Promise<unknown> | void;
};

const FEEDBACK_TAGS = ["Bug", "Slow/laggy", "Missing Feature", "Confusing UI"];

const RatingPromptModal = ({
  visible,
  userId,
  onClose,
  initialStep = "enjoying",
  onSubmitFeedback,
}: RatingPromptModalProps) => {
  const [step, setStep] = useState<RatingPromptStep>(initialStep);
  const [starRating, setStarRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Bug"]);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    captureEvent("rating_prompt_shown");
    setStep(initialStep);
    setStarRating(5);
    setSelectedTags(["Bug"]);
    setFeedbackText("");
    setSubmitting(false);
  }, [visible, initialStep]);

  useEffect(() => {
    if (!visible) return;
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      },
    );
    return () => {
      showSub.remove();
    };
  }, [visible]);

  const finishPrompt = useCallback(async () => {
    captureEvent("rating_prompt_dismissed");
    try {
      await markRatingPromptDismissed();
    } catch (error) {
      logError("Failed to persist rating prompt dismissal", error);
    }
    onClose();
  }, [onClose]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmitRating = useCallback(async () => {
    if (submitting) return;

    if (starRating >= 4) {
      setSubmitting(true);
      try {
        await finishPrompt();
        if (onSubmitFeedback) {
          void Promise.resolve(
            onSubmitFeedback({ userId, isLiked: true, rating: starRating }),
          ).catch((error) => {
            logError("Rating liked submission failed", error);
          });
        }
        Rate.rate(rateBoxOptions, (success, errorMessage) => {
          if (!success || errorMessage) {
            void openReviewInStore();
          }
        });
      } catch {
        await finishPrompt();
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep("feedbackForm");
    }
  }, [finishPrompt, onSubmitFeedback, starRating, submitting, userId]);

  const handleSubmitFeedback = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const combinedFeedback = [
      selectedTags.length > 0 ? `Tags: ${selectedTags.join(", ")}` : "",
      feedbackText.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (onSubmitFeedback) {
        await onSubmitFeedback({
          userId,
          isLiked: false,
          rating: starRating,
          feedback: combinedFeedback || "No text feedback provided",
        });
      }
      showToastMessage("Thank you for your feedback!");
    } catch (error) {
      logError("Feedback submission failed", error);
    } finally {
      setSubmitting(false);
      await finishPrompt();
    }
  }, [feedbackText, finishPrompt, onSubmitFeedback, selectedTags, starRating, submitting, userId]);

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => void finishPrompt()}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => void finishPrompt()}
        />

        <View style={styles.cardWrap} pointerEvents="box-none">
          <View style={styles.card}>
            <ScrollView
              ref={scrollViewRef}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cardScroll}
            >
              {step === "enjoying" ? (
                <>
                  <View style={styles.headerRow}>
                    <View style={styles.logoBadge}>
                      <Image
                        source={images.LOADING_LOGO}
                        style={styles.logoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => void finishPrompt()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <CustomText text="Enjoying Stron" style={styles.titleText} />
                  <CustomText
                    text="Let us know how your experience has been so far"
                    style={styles.subtitleText}
                  />

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setStarRating(star)}
                        style={styles.starTouch}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={star <= starRating ? "star" : "star-outline"}
                          size={36}
                          color={star <= starRating ? "#FFC107" : "rgba(255,255,255,0.35)"}
                        />
                      </Pressable>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => void handleSubmitRating()}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <CustomText text="Submit" style={styles.primaryButtonText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep("feedbackForm")}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <CustomText text="Give us Feedback" style={styles.secondaryButtonText} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.headerRow}>
                    <View style={styles.headerSpacer} />
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => void finishPrompt()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <CustomText text="What can we improve?" style={styles.titleText} />
                  <CustomText
                    text="Sorry to hear that. Your feedback helps us make STRON better — tell us what went wrong."
                    style={styles.subtitleText}
                  />

                  <View style={styles.tagsContainer}>
                    {FEEDBACK_TAGS.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          activeOpacity={0.7}
                          style={[
                            styles.tagChip,
                            selected ? styles.tagChipActive : styles.tagChipInactive,
                          ]}
                        >
                          <CustomText text={tag} style={styles.tagText} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    value={feedbackText}
                    onChangeText={(text) => {
                      setFeedbackText(text);
                      handleInputFocus();
                    }}
                    onFocus={handleInputFocus}
                    placeholder="Tell us more (optional)"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    style={styles.textAreaInput}
                    multiline
                    textAlignVertical="top"
                    editable={!submitting}
                  />

                  <TouchableOpacity
                    style={[styles.primaryButton, styles.sendButtonSpacing]}
                    onPress={() => void handleSubmitFeedback()}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <CustomText text="Send Feedback" style={styles.primaryButtonText} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RatingPromptModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  cardWrap: {
    width: "100%",
    paddingHorizontal: 22,
    maxWidth: 420,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#141418",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  cardScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerSpacer: {
    width: "12%",
    aspectRatio: 1,
    maxWidth: 40,
  },
  logoBadge: {
    width: "16%",
    aspectRatio: 1,
    maxWidth: 48,
    backgroundColor: "#0A0A0C",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  logoImage: {
    width: "78%",
    height: "78%",
  },
  closeButton: {
    width: "12%",
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    ...headingTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitleText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  starTouch: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#2A80FF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  primaryButtonText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#3A3A40",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  secondaryButtonText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
  },
  tagChipActive: {
    backgroundColor: "#2A80FF",
    borderColor: "#2A80FF",
  },
  tagChipInactive: {
    backgroundColor: "#2C2C30",
    borderColor: "#4E4E4E",
  },
  tagText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
  },
  textAreaInput: {
    ...fontTextStyles.sixteenNormalBlack,
    width: "100%",
    backgroundColor: "#222226",
    borderWidth: 1,
    borderColor: "#3A3A40",
    borderRadius: 14,
    minHeight: 110,
    color: "#FFFFFF",
    padding: 14,
  },
  sendButtonSpacing: {
    marginTop: 16,
    marginBottom: 0,
  },
});

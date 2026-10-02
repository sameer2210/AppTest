import React, { useCallback, useMemo, useState } from "react";
import { Image, RefreshControl, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppScrollView, PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { NotificationListSkeleton } from "@/components/skeletons";
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { InboxNotification, OpinionResultData } from "@/features/notifications";
import {
  fetchInboxNotificationsThunk,
  markAllInboxNotificationsReadThunk,
  dismissInboxNotificationThunk,
} from "../../model/notifications.thunks";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { images } from "@/utils/images";
import { SCREEN_CONTENT_PADDING_BOTTOM, screenContentContainerStyle } from "@/utils/screen-layout";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { captureEvent } from "@/analytics/posthog/events";
import { useProSubscription } from "@/features/gymBusiness";

interface ActionMeta {
  buttonLabel?: string;
  subtitle?: string | null;
  onPress: () => void;
}

const isOpinionResult = (
  item: InboxNotification,
): item is InboxNotification & { data: OpinionResultData } => {
  const data = item.data as OpinionResultData | null | undefined;
  return item.tag === "Opinion Result" || data?.kind === "opinion_result";
};

const OpinionResultCard = ({
  item,
  onDismiss,
}: {
  item: InboxNotification;
  onDismiss: (item: InboxNotification) => void;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);

  const data = (item.data || {}) as Partial<OpinionResultData>;
  const subtitle =
    item.body?.trim() ||
    (data.questionNumber != null ? `STRON Opinion #${data.questionNumber}` : "STRON Opinion");
  const questionText = data.questionText?.trim() || "";
  const options = Array.isArray(data.options) ? data.options.slice(0, 2) : [];

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const removeActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 2 ? 1 : 0,
  }));

  const finishDismiss = useCallback(() => {
    onDismiss(item);
  }, [item, onDismiss]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(16)
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          translateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldDismiss = translateX.value > screenWidth * 0.32 || event.velocityX > 900;
          if (shouldDismiss) {
            translateX.value = withTiming(screenWidth, { duration: 180 }, (finished) => {
              if (finished) runOnJS(finishDismiss)();
            });
            return;
          }
          translateX.value = withTiming(0, { duration: 200 });
        }),
    [finishDismiss, screenWidth, translateX],
  );

  const toggleExpanded = () => {
    captureEvent("inbox_item_tapped", {
      notification_id: item.id,
      kind: "opinion_result",
    });
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.cardWrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.removeAction, removeActionStyle]}
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <CustomText style={[styles.removeActionText, fontTextStyles.bodyMedium]}>Remove</CustomText>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={swipeStyle}>
          <PressableScale
            onPress={toggleExpanded}
            style={styles.opinionCard}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderTextCol}>
                <CustomText style={[styles.cardTitle, fontTextStyles.bodyBold]}>
                  {item.title || "Poll results are in!"}
                </CustomText>
                <CustomText style={[styles.cardSubtitle, fontTextStyles.body]}>{subtitle}</CustomText>
              </View>
              <Ionicons
                name={expanded ? "caret-up" : "caret-down"}
                size={16}
                color="rgba(255,255,255,0.85)"
                style={{ marginTop: 2 }}
              />
            </View>

            {expanded ? (
              <View style={styles.expandedSection}>
                {questionText ? (
                  <CustomText style={[styles.questionText, fontTextStyles.bodyMedium]}>
                    {questionText}
                  </CustomText>
                ) : null}

                {options.map((opt) => {
                  const pct = Math.max(0, Math.min(100, Number(opt.percentage) || 0));
                  return (
                    <View key={opt.optionId || opt.text} style={styles.optionRow}>
                      <CustomText style={[styles.optionText, fontTextStyles.body]} numberOfLines={2}>
                        {opt.text}
                      </CustomText>
                      <View style={styles.progressRow}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[styles.progressBar, { width: `${pct}%` }]}
                          />
                        </View>
                        <CustomText style={[styles.percentageText, fontTextStyles.bodySemiBold]}>
                          {pct}%
                        </CustomText>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </PressableScale>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const resolveAction = (
  item: InboxNotification,
  router: ReturnType<typeof useRouter>,
  onOpenStronPro?: () => void,
): ActionMeta => {
  const blob = `${item.tag || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  const gymData = (item.data || {}) as { kind?: string; businessId?: string };
  const gymBusinessId = gymData.businessId || "";

  if (
    item.tag === "Gym Purchase" ||
    item.tag === "Gym Plan Activated" ||
    item.tag === "Gym Auto-renew" ||
    item.tag === "Gym Auto-renew Failed" ||
    item.tag === "Gym Auto-renew Off"
  ) {
    return {
      buttonLabel: item.tag === "Gym Auto-renew Failed" ? "View plans" : "Check In",
      onPress: () =>
        router.push({
          pathname: href.app.checkInSelection,
          params: { businessId: gymBusinessId },
        } as never),
    };
  }

  if (item.tag === "Gym New Sale" || item.tag === "Gym Renew Failed") {
    return {
      buttonLabel: "View members",
      onPress: () => router.push(href.app.gymMembers as never),
    };
  }

  // Pro / Session Renewal
  if (
    blob.includes("pro expired") ||
    blob.includes("membership expired") ||
    blob.includes("session expired")
  ) {
    return {
      buttonLabel: "Renew Now",
      onPress: () => (onOpenStronPro ? onOpenStronPro() : router.push(href.app.stronPro as never)),
    };
  }

  // Buy Pro
  if (
    blob.includes("buy stron pro") ||
    blob.includes("buy stron") ||
    blob.includes("insights and analytics")
  ) {
    return {
      buttonLabel: "Buy Now",
      onPress: () => (onOpenStronPro ? onOpenStronPro() : router.push(href.app.stronPro as never)),
    };
  }

  // Shadow / Step Race Revenge
  if (blob.includes("lost") || blob.includes("shadow") || blob.includes("take revenge")) {
    return {
      buttonLabel: "Take Revenge",
      onPress: () => router.push(href.app.stepRace as never),
    };
  }

  // Business Member Plans Expired
  if (blob.includes("plans expired") || blob.includes("expired this week")) {
    return {
      buttonLabel: "Remind them",
      onPress: () => router.push(href.app.manualPayments as never),
    };
  }

  // Event creation incomplete
  if (blob.includes("detail incomplete") || blob.includes("incomplete")) {
    return {
      buttonLabel: "Complete Now",
      onPress: () => router.push(href.app.organizeCreate as never),
    };
  }

  // Event tickets sold out
  if (blob.includes("sold out") || blob.includes("tickets sold out")) {
    return {
      buttonLabel: "Add More Now",
      onPress: () => router.push(href.app.listings as never),
    };
  }

  // Event starts today
  if (blob.includes("starts today") || blob.includes("started")) {
    return {
      subtitle: "All the Best.",
      onPress: () => {
        if (item.eventKey) {
          router.push({
            pathname: href.app.stronEvent,
            params: { key: item.eventKey },
          } as never);
        }
      },
    };
  }

  // Event ends today
  if (blob.includes("ends today")) {
    return {
      subtitle: "Give your Best.",
      onPress: () => {
        if (item.eventKey) {
          router.push({
            pathname: href.app.stronEvent,
            params: { key: item.eventKey },
          } as never);
        }
      },
    };
  }

  // Members checked in
  if (blob.includes("checked in") || blob.includes("check-in")) {
    return {
      onPress: () => router.push(href.app.gymMembers as never),
    };
  }

  // Default with event link
  if (item.eventKey) {
    return {
      subtitle: item.body?.trim() || null,
      onPress: () => {
        router.push({
          pathname: href.app.stronEvent,
          params: { key: item.eventKey },
        } as never);
      },
    };
  }

  return {
    subtitle: item.body?.trim() || null,
    onPress: () => {},
  };
};

const DefaultNotificationCard = ({
  item,
  onDismiss,
  onOpenStronPro,
}: {
  item: InboxNotification;
  onDismiss: (item: InboxNotification) => void;
  onOpenStronPro?: () => void;
}) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);

  const action = useMemo(
    () => resolveAction(item, router, onOpenStronPro),
    [item, onOpenStronPro, router],
  );

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const removeActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 2 ? 1 : 0,
  }));

  const finishDismiss = useCallback(() => {
    onDismiss(item);
  }, [item, onDismiss]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(16)
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          translateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldDismiss = translateX.value > screenWidth * 0.32 || event.velocityX > 900;
          if (shouldDismiss) {
            translateX.value = withTiming(screenWidth, { duration: 180 }, (finished) => {
              if (finished) runOnJS(finishDismiss)();
            });
            return;
          }
          translateX.value = withTiming(0, { duration: 200 });
        }),
    [finishDismiss, screenWidth, translateX],
  );

  const handleCardPress = () => {
    captureEvent("inbox_item_tapped", {
      notification_id: item.id,
      kind: item.tag || "notification",
      event_key: item.eventKey || undefined,
    });
    action.onPress();
  };

  return (
    <View style={styles.cardWrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.removeAction, removeActionStyle]}
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <CustomText style={[styles.removeActionText, fontTextStyles.bodyMedium]}>Remove</CustomText>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={swipeStyle}>
          <PressableScale
            onPress={handleCardPress}
            style={styles.defaultCard}
          >
            <View style={styles.defaultCardContentCol}>
              <CustomText style={[styles.defaultCardTitle, fontTextStyles.bodyBold]}>
                {item.title || "Notification"}
              </CustomText>
              {action.subtitle ? (
                <CustomText style={[styles.defaultCardSubtitle, fontTextStyles.bodyMedium]}>
                  {action.subtitle}
                </CustomText>
              ) : null}
            </View>

            <View style={styles.defaultCardActionCol}>
              {action.buttonLabel ? (
                <PressableScale
                  onPress={handleCardPress}
                  style={styles.actionButton}
                >
                  <CustomText style={[styles.actionButtonText, fontTextStyles.bodySemiBold]}>
                    {action.buttonLabel}
                  </CustomText>
                </PressableScale>
              ) : (
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
              )}
            </View>
          </PressableScale>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const NotificationCard = ({
  item,
  onDismiss,
  onOpenStronPro,
}: {
  item: InboxNotification;
  onDismiss: (item: InboxNotification) => void;
  onOpenStronPro?: () => void;
}) => {
  if (isOpinionResult(item)) {
    return <OpinionResultCard item={item} onDismiss={onDismiss} />;
  }
  return (
    <DefaultNotificationCard item={item} onDismiss={onDismiss} onOpenStronPro={onOpenStronPro} />
  );
};

const NotificationsScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const { subscribe } = useProSubscription();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isProfileIncomplete = !user?.about || !user?.shortBio || !user?.username;

  const load = useCallback(async () => {
    try {
      const notifications = await dispatch(fetchInboxNotificationsThunk()).unwrap();
      setItems(notifications);
      void dispatch(markAllInboxNotificationsReadThunk());
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("Authentication required"))) {
        showToastMessage(error instanceof Error ? error.message : "Could not load notifications.");
      }
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dismissNotification = useCallback(
    (item: InboxNotification) => {
      captureEvent("inbox_item_dismissed", {
        notification_id: item.id,
        kind: item.tag || "notification",
        event_key: item.eventKey || undefined,
      });
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      void dispatch(dismissInboxNotificationThunk(item.id))
        .unwrap()
        .catch(() => {
          showToastMessage("Could not remove notification.");
          void load();
        });
    },
    [dispatch, load],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Image
        source={images.HOME_V2.BG}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <ScreenSafeArea>
        <AppScrollView
          style={styles.scrollView}
          contentContainerStyle={screenContentContainerStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.headerRow}>
            <PressableScale
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </PressableScale>
            <CustomText style={[headingTextStyles.h1, styles.headerTitle]}>Notifications</CustomText>
          </View>

          {loading ? (
            <NotificationListSkeleton count={4} />
          ) : (
            <Animated.View entering={FadeIn.duration(400)}>
              {isProfileIncomplete ? (
                <View style={styles.actionRequiredSection}>
                  <CustomText style={[styles.sectionTitle, fontTextStyles.body]}>Action Required</CustomText>
                  <PressableScale
                    style={styles.incompleteProfileCard}
                    onPress={() => {
                      captureEvent("inbox_item_tapped", { kind: "profile_incomplete" });
                      router.push(href.app.editProfile as never);
                    }}
                  >
                    <View style={styles.incompleteProfileTextCol}>
                      <CustomText style={[styles.incompleteProfileSubtext, fontTextStyles.body]}>
                        Your Profile is not Completed
                      </CustomText>
                      <CustomText style={[styles.incompleteProfileMainText, fontTextStyles.bodyMedium]}>
                        Add Description
                      </CustomText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                  </PressableScale>
                </View>
              ) : null}

              <View>
                <CustomText style={[styles.sectionTitle, fontTextStyles.body]}>Notification</CustomText>
                {items.length === 0 ? (
                  <CustomText style={[styles.emptyText, fontTextStyles.body]}>
                    No notifications yet. Event updates will show up here.
                  </CustomText>
                ) : (
                  <View style={styles.listContainer}>
                    {items.map((item) => (
                      <Animated.View
                        key={item.id}
                        layout={LinearTransition.duration(280).easing(
                          Easing.bezier(0.25, 0.1, 0.25, 1),
                        )}
                      >
                        <NotificationCard
                          item={item}
                          onDismiss={dismissNotification}
                          onOpenStronPro={() => {
                            void subscribe();
                          }}
                        />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </AppScrollView>
      </ScreenSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    transform: [{ scaleY: -1 }],
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  cardWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  removeAction: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E53E3E",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    borderRadius: 16,
  },
  removeActionText: {
    fontSize: 13,
    color: "#FFFFFF",
    marginLeft: 8,
  },
  opinionCard: {
    borderRadius: 16,
    backgroundColor: "#18191E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardHeaderTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: 4,
  },
  expandedSection: {
    marginTop: 12,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  optionRow: {
    marginBottom: 12,
  },
  optionText: {
    fontSize: 13,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginRight: 10,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2B7FFF",
  },
  percentageText: {
    fontSize: 13,
    color: "#2B7FFF",
    width: 40,
    textAlign: "right",
  },
  defaultCard: {
    borderRadius: 14,
    backgroundColor: "#18191E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  defaultCardContentCol: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "center",
  },
  defaultCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
  defaultCardSubtitle: {
    fontSize: 13,
    color: "#2B7FFF",
    marginTop: 4,
  },
  defaultCardActionCol: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionButton: {
    backgroundColor: "#2B7FFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  actionRequiredSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  incompleteProfileCard: {
    backgroundColor: "#191919",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  incompleteProfileTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  incompleteProfileSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
  },
  incompleteProfileMainText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    paddingVertical: 32,
  },
  listContainer: {
    paddingTop: 2,
  },
});

export default NotificationsScreen;

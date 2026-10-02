import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import PressableScale from "./PressableScale";
import Text from "@/components/CustomText";

type Props = {
  visible: boolean;
  title?: string;
  initialTime?: string;
  onClose: () => void;
  onConfirm: (formattedTime: string) => void;
};

const ITEM_HEIGHT = 40;

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = Array.from({ length: 60 }, (_, i) => (i < 10 ? `0${i}` : `${i}`));
const PERIODS: ("AM" | "PM")[] = ["AM", "PM"];

type TimeParts = {
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

const parseTimeString = (timeStr?: string): TimeParts => {
  if (!timeStr) {
    return { hour: "06", minute: "00", period: "AM" };
  }
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hr = parseInt(match[1], 10);
    const min = match[2];
    const period = match[3] ? match[3].toUpperCase() : hr >= 12 ? "PM" : "AM";
    if (hr > 12) hr -= 12;
    if (hr === 0) hr = 12;
    return {
      hour: String(hr).padStart(2, "0"),
      minute: String(min).padStart(2, "0"),
      period: period === "PM" ? "PM" : "AM",
    };
  }
  return { hour: "06", minute: "00", period: "AM" };
};

export const DarkTimePickerModal: React.FC<Props> = ({
  visible,
  title = "Pick a Time",
  initialTime,
  onClose,
  onConfirm,
}) => {
  const parsed = useMemo(() => parseTimeString(initialTime), [initialTime]);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(parsed.period);

  const hourListRef = useRef<FlatList>(null);
  const minuteListRef = useRef<FlatList>(null);
  const periodListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      const p = parseTimeString(initialTime);
      setSelectedHour(p.hour);
      setSelectedMinute(p.minute);
      setSelectedPeriod(p.period);
    }
  }, [visible, initialTime]);

  // Scroll wheel to selected items when modal opens
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        const hrIdx = Math.max(0, HOURS.indexOf(selectedHour));
        if (hrIdx >= 0) hourListRef.current?.scrollToIndex({ index: hrIdx, animated: false });

        const minIdx = Math.max(0, MINUTES.indexOf(selectedMinute));
        if (minIdx >= 0) minuteListRef.current?.scrollToIndex({ index: minIdx, animated: false });

        const periodIdx = Math.max(0, PERIODS.indexOf(selectedPeriod));
        if (periodIdx >= 0)
          periodListRef.current?.scrollToIndex({ index: periodIdx, animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [visible, selectedHour, selectedMinute, selectedPeriod]);

  const handleDone = () => {
    const formatted = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onConfirm(formatted);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {/* Wheel Selector Container */}
          <View style={styles.wheelContainer}>
            {/* Active Row Highlight Bar with Left/Right Arrows */}
            <View style={styles.selectionHighlight}>
              <Text style={styles.arrowLeft}>▶</Text>
              <Text style={styles.arrowRight}>◀</Text>
            </View>

            <View style={styles.columnsRow}>
              {/* Hour Column */}
              <View style={styles.column}>
                <FlatList
                  ref={hourListRef}
                  data={HOURS}
                  keyExtractor={(item) => `hour-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  contentContainerStyle={styles.listPadding}
                  onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (HOURS[idx] !== undefined) setSelectedHour(HOURS[idx]);
                  }}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedHour;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedHour(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Colon Separator */}
              <View style={styles.separatorContainer}>
                <Text style={styles.colonText}>:</Text>
              </View>

              {/* Minute Column */}
              <View style={styles.column}>
                <FlatList
                  ref={minuteListRef}
                  data={MINUTES}
                  keyExtractor={(item) => `min-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  contentContainerStyle={styles.listPadding}
                  onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (MINUTES[idx] !== undefined) setSelectedMinute(MINUTES[idx]);
                  }}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedMinute;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedMinute(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Period Column (AM/PM) */}
              <View style={styles.column}>
                <FlatList
                  ref={periodListRef}
                  data={PERIODS}
                  keyExtractor={(item) => `period-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  contentContainerStyle={styles.listPadding}
                  onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (PERIODS[idx] !== undefined) setSelectedPeriod(PERIODS[idx] as "AM" | "PM");
                  }}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedPeriod;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedPeriod(item as "AM" | "PM")}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>
          </View>

          {/* Done Button */}
          <PressableScale onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </PressableScale>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: 290,
    backgroundColor: "#161616",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  title: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  wheelContainer: {
    width: "100%",
    height: 200,
    position: "relative",
    justifyContent: "center",
    marginBottom: 20,
  },
  selectionHighlight: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    pointerEvents: "none",
    zIndex: 10,
    paddingHorizontal: 6,
  },
  arrowLeft: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  arrowRight: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  columnsRow: {
    flexDirection: "row",
    height: 200,
    width: "100%",
    alignItems: "center",
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  separatorContainer: {
    width: 12,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  colonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    fontWeight: "700",
  },
  listPadding: {
    paddingVertical: 80,
  },
  item: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 17,
    fontWeight: "400",
    color: "rgba(255,255,255,0.35)",
  },
  itemTextSelected: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  doneBtn: {
    width: "100%",
    height: 46,
    backgroundColor: "#000000",
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default DarkTimePickerModal;

import { useMemo, useState, useRef, useEffect } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

const defaultNextDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 1, 0);
  return d;
};

export type DatePickerClamp = "min" | "max";

type Props = {
  visible: boolean;
  title?: string;
  initialDate?: Date;
  onClose: () => void;
  /** `clamped` is set when the chosen date was outside min/max and adjusted. */
  onConfirm: (date: Date, clamped?: DatePickerClamp) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

const startOfDay = (d: Date) => {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ITEM_HEIGHT = 40;

export const DarkDatePickerModal = ({
  visible,
  title = "Pick a Date",
  initialDate,
  onClose,
  onConfirm,
  minimumDate,
  maximumDate,
}: Props) => {
  const activeInitDate = initialDate || defaultNextDay();
  const [selectedDay, setSelectedDay] = useState(activeInitDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(activeInitDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(activeInitDate.getFullYear());

  const dayListRef = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);
  const yearListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      const d = initialDate || defaultNextDay();
      setSelectedDay(d.getDate());
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
    }
  }, [visible, initialDate]);

  const currentYear = new Date().getFullYear();
  const startYear = Math.min(
    currentYear - 3,
    (initialDate || minimumDate)?.getFullYear() || currentYear,
  );
  const endYear = Math.max(
    currentYear + 10,
    (maximumDate || initialDate)?.getFullYear() || currentYear + 10,
  );

  const years = useMemo(() => {
    const list = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, [startYear, endYear]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const days = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(d);
    }
    return list;
  }, [daysInMonth]);

  // Scroll wheel to selected item when modal opens
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        const dayIdx = Math.max(0, days.indexOf(selectedDay));
        if (dayIdx >= 0) dayListRef.current?.scrollToIndex({ index: dayIdx, animated: false });
        if (selectedMonth >= 0)
          monthListRef.current?.scrollToIndex({ index: selectedMonth, animated: false });
        const yearIdx = Math.max(0, years.indexOf(selectedYear));
        if (yearIdx >= 0) yearListRef.current?.scrollToIndex({ index: yearIdx, animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [visible, days, selectedDay, selectedMonth, selectedYear, years]);

  const handleDone = () => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const date = startOfDay(new Date(selectedYear, selectedMonth, validDay, 12, 0, 0));
    const min = minimumDate ? startOfDay(minimumDate) : null;
    const max = maximumDate ? startOfDay(maximumDate) : null;

    if (min && date < min) {
      onConfirm(min, "min");
    } else if (max && date > max) {
      onConfirm(max, "max");
    } else {
      onConfirm(date);
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <CustomText style={styles.title}>{title}</CustomText>

          {/* Wheel Selector Container */}
          <View style={styles.wheelContainer}>
            {/* Active Row Highlight Bar with Left/Right Arrows */}
            <View style={styles.selectionHighlight}>
              <CustomText style={styles.arrowLeft}>▶</CustomText>
              <CustomText style={styles.arrowRight}>◀</CustomText>
            </View>

            <View style={styles.columnsRow}>
              {/* Day Column */}
              <View style={styles.column}>
                <FlatList
                  ref={dayListRef}
                  data={days}
                  keyExtractor={(item) => `day-${item}`}
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
                    if (days[idx] !== undefined) setSelectedDay(days[idx]);
                  }}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedDay;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedDay(item)}
                        activeOpacity={0.7}
                      >
                        <CustomText style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item < 10 ? `0${item}` : item}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Month Column */}
              <View style={styles.column}>
                <FlatList
                  ref={monthListRef}
                  data={MONTHS}
                  keyExtractor={(item, index) => `month-${index}`}
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
                    if (MONTHS[idx] !== undefined) setSelectedMonth(idx);
                  }}
                  renderItem={({ item, index }) => {
                    const isSelected = index === selectedMonth;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedMonth(index)}
                        activeOpacity={0.7}
                      >
                        <CustomText style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Year Column */}
              <View style={styles.column}>
                <FlatList
                  ref={yearListRef}
                  data={years}
                  keyExtractor={(item) => `year-${item}`}
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
                    if (years[idx] !== undefined) setSelectedYear(years[idx]);
                  }}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedYear;
                    return (
                      <TouchableOpacity
                        style={styles.item}
                        onPress={() => setSelectedYear(item)}
                        activeOpacity={0.7}
                      >
                        <CustomText style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                          {item}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>
          </View>

          {/* Done Button */}
          <PressableScale onPress={handleDone} style={styles.doneBtn}>
            <CustomText style={styles.doneBtnText}>Done</CustomText>
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
    ...fontTextStyles.eighteenNormalBlack,
    alignSelf: "flex-start",
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
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
  },
  arrowRight: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
  },
  columnsRow: {
    flexDirection: "row",
    height: 200,
    width: "100%",
  },
  column: {
    flex: 1,
    alignItems: "center",
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
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255,255,255,0.45)",
  },
  itemTextSelected: {
    ...fontTextStyles.twentyTwoBoldBlack,
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
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default DarkDatePickerModal;

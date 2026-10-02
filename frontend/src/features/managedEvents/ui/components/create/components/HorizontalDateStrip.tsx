import { useMemo, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

export type DayItem = {
  key: string;
  date: Date;
  dayLabel: string;
  dayNum: string;
  monthIndex: number;
};

type Props = {
  selected: Date;
  onSelect: (date: Date) => void;
  daysAhead?: number;
  /**
   * Side inset for month labels + first/last day pills.
   * Use when the strip is full-bleed (parent cancelled horizontal padding).
   */
  contentInset?: number;
  /** Field label above the strip (same style as CreateGlassField). */
  label?: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_INSET = 16;

const startOfDay = (d: Date) => {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatIsoDay = (d: Date) => toDayKey(d);

/** Horizontal month + day strip — matches Figma glass pills + selected white/black. */
const HorizontalDateStrip = ({
  selected,
  onSelect,
  daysAhead = 60,
  contentInset = DEFAULT_INSET,
  label = "Event Start date",
}: Props) => {
  const selectedDay = startOfDay(selected);
  const scrollRef = useRef<ScrollView>(null);

  const days = useMemo(() => {
    const start = startOfDay(new Date());
    start.setDate(start.getDate() + 1);
    const list: DayItem[] = [];
    for (let i = 0; i < daysAhead; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      list.push({
        key: toDayKey(date),
        date,
        dayLabel: WEEKDAYS[date.getDay()],
        dayNum: String(date.getDate()).padStart(2, "0"),
        monthIndex: date.getMonth(),
      });
    }
    return list;
  }, [daysAhead]);

  const monthIndex = selectedDay.getMonth();

  return (
    <View style={styles.wrap}>
      <View style={[styles.headingRow, { paddingHorizontal: contentInset }]}>
        {label ? (
          <CustomText style={[styles.headingLabel, styles.labelText]}>
            {label}
          </CustomText>
        ) : (
          <View style={styles.headingLabel} />
        )}
        <CustomText style={styles.monthText}>{MONTHS[monthIndex]}</CustomText>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={[styles.dayRow, { paddingHorizontal: contentInset }]}
      >
        {days.map((item) => {
          const isSelected = toDayKey(item.date) === toDayKey(selectedDay);
          return (
            <PressableScale
              key={item.key}
              onPress={() => onSelect(item.date)}
              style={[styles.dayPill, isSelected && styles.dayPillSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <CustomText
                style={[
                  styles.weekday,
                  isSelected ? styles.weekdaySelected : styles.weekdayUnselected,
                ]}
              >
                {item.dayLabel}
              </CustomText>
              <View
                style={[
                  styles.dayCircle,
                  isSelected ? styles.dayCircleSelected : styles.dayCircleUnselected,
                ]}
              >
                <CustomText
                  style={[
                    styles.dayNum,
                    isSelected ? styles.dayNumSelected : styles.dayNumUnselected,
                  ]}
                >
                  {item.dayNum}
                </CustomText>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "visible",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headingLabel: {
    flex: 1,
    marginRight: 12,
  },
  labelText: {
    fontSize: 14,
    color: "#D9D9D9",
  },
  monthText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.75)",
  },
  dayScroll: {
    overflow: "visible",
  },
  dayRow: {
    gap: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  dayPill: {
    width: 48,
    height: 72,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  dayPillSelected: {
    backgroundColor: "#FFFFFF",
    borderRadius: 42,
    paddingBottom: 8,
  },
  weekday: {
    marginBottom: 6,
    zIndex: 2,
    fontSize: 12,
  },
  weekdaySelected: {
    color: "#000000",
  },
  weekdayUnselected: {
    color: "#FFFFFF",
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // Visible on dark screens and blue gradients.
  dayCircleUnselected: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  dayCircleSelected: {
    backgroundColor: "#000000",
  },
  dayNum: {
    fontSize: 16,
    fontWeight: "500",
  },
  dayNumSelected: {
    color: "#D9D9D9",
  },
  dayNumUnselected: {
    color: "#FFFFFF",
  },
});

export default HorizontalDateStrip;

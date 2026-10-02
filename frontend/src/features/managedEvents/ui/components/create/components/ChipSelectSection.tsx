import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
};

export type ChipSelectSectionHandle = {
  /** Commit any typed custom option into `selected`, then clear the input. */
  commitCustom: () => void;
};

/**
 * Collapsed: same black row height as SuggestionRow.
 * Expanded (tap): shows selectable / unselectable chips.
 */
const ChipSelectSection = forwardRef<ChipSelectSectionHandle, Props>(
  ({ title, subtitle, icon, options, selected, onChange, allowCustom = true }, ref) => {
    const [expanded, setExpanded] = useState(false);
    const customRef = useRef<CustomChipHandle>(null);

    useImperativeHandle(
      ref,
      () => ({
        commitCustom: () => customRef.current?.commit(),
      }),
      [],
    );

    const toggle = (label: string) => {
      if (selected.includes(label)) {
        onChange(selected.filter((s) => s !== label));
      } else {
        onChange([...selected, label]);
      }
    };

    const addCustom = (raw: string) => {
      const label = raw.trim();
      if (!label || selected.includes(label)) return;
      onChange([...selected, label]);
    };

    const chips = [...options, ...selected.filter((s) => !options.includes(s as never))];
    const summary =
      selected.length > 0
        ? selected.slice(0, 2).join(", ") + (selected.length > 2 ? "…" : "")
        : undefined;

    return (
      <View
        style={[
          styles.card,
          title !== "" && styles.cardWithBorder,
          expanded && styles.cardExpanded,
        ]}
      >
        {title !== "" ? (
          <PressableScale
            onPress={() => setExpanded((v) => !v)}
            style={styles.header}
            accessibilityRole="button"
          >
            <Ionicons name={icon} size={22} color="#D9D9D9" style={styles.icon} />
            <View style={styles.copy}>
              <CustomText style={styles.title} numberOfLines={1}>
                {title}
              </CustomText>
              {!expanded && (summary || subtitle) ? (
                <CustomText style={styles.value} numberOfLines={1}>
                  {summary || subtitle}
                </CustomText>
              ) : null}
            </View>
            <Ionicons name={expanded ? "remove" : "add"} size={22} color="#086CFF" />
          </PressableScale>
        ) : null}

        {expanded || title === "" ? (
          <View style={[styles.chips, title === "" && styles.chipsModal]}>
            {chips.map((opt) => {
              const on = selected.includes(opt);
              return (
                <PressableScale
                  key={opt}
                  onPress={() => toggle(opt)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  <Ionicons
                    name={on ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={on ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                    style={{ marginRight: 6 }}
                  />
                  <CustomText style={[styles.chipText, on && styles.chipTextOn]}>{opt}</CustomText>
                </PressableScale>
              );
            })}
            {allowCustom ? <CustomChip ref={customRef} onAdd={addCustom} /> : null}
          </View>
        ) : null}
      </View>
    );
  },
);

type CustomChipHandle = {
  commit: () => void;
};

const CustomChip = forwardRef<CustomChipHandle, { onAdd: (v: string) => void }>(
  ({ onAdd }, ref) => {
    const [value, setValue] = useState("");
    const valueRef = useRef(value);
    valueRef.current = value;

    const commit = useCallback(() => {
      const next = valueRef.current.trim();
      if (!next) return;
      onAdd(next);
      setValue("");
    }, [onAdd]);

    useImperativeHandle(ref, () => ({ commit }), [commit]);

    return (
      <View style={styles.customChip}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="+ Add Custom Option"
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.customInput}
          onSubmitEditing={commit}
          returnKeyType="done"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    borderRadius: 14,
    minHeight: 44,
    overflow: "hidden",
  },
  cardWithBorder: {
    backgroundColor: "#191919",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardExpanded: {
    paddingBottom: 14,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  icon: {
    width: 24,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#D9D9D9",
  },
  value: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
    paddingLeft: 58,
    marginTop: 6,
  },
  chipsModal: {
    paddingHorizontal: 0,
    paddingLeft: 0,
    marginTop: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  chipOff: {
    backgroundColor: "#252528",
    borderColor: "rgba(255,255,255,0.18)",
  },
  chipOn: {
    backgroundColor: "#086CFF",
    borderColor: "#086CFF",
  },
  chipText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#D9D9D9",
  },
  chipTextOn: {
    color: "#FFFFFF",
  },
  customChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    minHeight: 42,
  },
  customInput: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    paddingVertical: 4,
    minWidth: 140,
    flexGrow: 1,
  },
});

export default ChipSelectSection;

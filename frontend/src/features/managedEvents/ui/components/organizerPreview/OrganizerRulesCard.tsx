import React from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";

interface OrganizerRulesCardProps {
  rules: string[];
}

export const OrganizerRulesCard = React.memo(({ rules }: OrganizerRulesCardProps) => {
  return (
    <View style={styles.card}>
      <CustomText style={styles.heading}>
        Description
      </CustomText>
      {rules.map((rule, idx) => (
        <View key={`rule-${idx}`} style={styles.ruleRow}>
          <CustomText style={styles.bullet}>• </CustomText>
          <CustomText style={styles.ruleText}>
            {rule}
          </CustomText>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#191919",
    padding: 20,
  },
  heading: {
    marginBottom: 8,
    paddingLeft: 8,
    paddingTop: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  ruleRow: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 8,
  },
  bullet: {
    flexShrink: 0,
    fontSize: 14,
    color: "#FFFFFF",
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
  },
});

export default OrganizerRulesCard;

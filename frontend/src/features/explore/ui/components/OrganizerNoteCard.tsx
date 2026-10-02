import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";

interface OrganizerNoteCardProps {
  note: string;
}

const OrganizerNoteCard = ({ note }: OrganizerNoteCardProps) => {
  if (!note) return null;

  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.noteTitle}>Organizer Note</CustomText>
      <CustomText style={styles.noteText}>{note}</CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  noteTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#000000",
    marginBottom: 4,
  },
  noteText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#000000",
  },
});

export default OrganizerNoteCard;

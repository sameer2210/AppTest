import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TextInput, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

export type TicketFormFormat = "marathon" | "step_challenge" | "single_entry";

export type DraftTicket = {
  id: string;
  label: string;
  price: number;
  capacity?: number;
  benefits?: string;
  imageUrl?: string;
  distanceKm?: number;
  days?: number;
  dailyStepTarget?: number;
};

type Props = {
  ticket: DraftTicket;
  index: number;
  format: TicketFormFormat;
  onChange: (updates: Partial<DraftTicket>) => void;
};

const CreateTicketCard = React.memo(({ ticket, index, format, onChange }: Props) => {
  const isStep = format === "step_challenge";
  const isSingle = format === "single_entry";
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToastMessage("Permission required to pick image");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsUploading(true);
        try {
          const uploadedUrl = await ImageUploadService.uploadProfileImage(
            result.assets[0].uri,
            `ticket_${ticket.id || Date.now()}`,
          );
          onChange({ imageUrl: uploadedUrl });
          showToastMessage("Image uploaded successfully!", "success");
        } catch (uploadErr: any) {
          showToastMessage(
            uploadErr?.message || "Couldn’t upload image. Check connection and try again.",
            "failure",
          );
        } finally {
          setIsUploading(false);
        }
      }
    } catch {
      // Gracefully handle picker dismissal or system dialog cancellation
    }
  }, [ticket.id, onChange]);

  const handleRemoveImage = useCallback(() => {
    onChange({ imageUrl: undefined });
  }, [onChange]);

  return (
    <LinearGradient
      colors={["#3573FA", "#1B47A4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <CustomText style={styles.title}>Create Ticket</CustomText>
      </View>

      <View style={styles.fieldBlock}>
        <CustomText style={styles.fieldLabel}>Title</CustomText>
        <TextInput
          value={ticket.label}
          onChangeText={(v) => onChange({ label: v })}
          placeholder="Standard"
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={styles.inputBox}
        />
      </View>

      {!isSingle && (
        <View style={styles.fieldBlock}>
          <CustomText style={styles.fieldLabel}>Benefits</CustomText>
          <View style={styles.benefitsContainer}>
            <TextInput
              value={ticket.benefits}
              onChangeText={(v) => onChange({ benefits: v })}
              multiline
              placeholder={
                isStep
                  ? "e.g. Daily step tracking, leaderboard access"
                  : "e.g. Finisher medal, distance certificate"
              }
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.benefitsInput}
            />
            <PressableScale style={styles.uploadBtn}>
              <CustomText style={styles.uploadText}>Upload Image</CustomText>
            </PressableScale>
          </View>
        </View>
      )}

      {!isSingle && (
        <View style={styles.inlineRow}>
          <CustomText style={styles.inlineTextLeft}>
            {isStep ? "Walk" : "Complete"}
          </CustomText>
          <TextInput
            value={
              isStep
                ? ticket.dailyStepTarget != null
                  ? String(ticket.dailyStepTarget)
                  : ""
                : ticket.distanceKm != null
                  ? String(ticket.distanceKm)
                  : ""
            }
            onChangeText={(v) => {
              const num = v ? Number(v) : undefined;
              onChange(isStep ? { dailyStepTarget: num } : { distanceKm: num });
            }}
            keyboardType="numeric"
            placeholder={isStep ? "e.g. 8000" : "e.g. 5"}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[styles.inputBox, styles.flexBox]}
          />
          <CustomText style={styles.inlineTextMid}>
            {isStep ? "steps in" : "Km in"}
          </CustomText>
          <TextInput
            value={ticket.days != null ? String(ticket.days) : ""}
            onChangeText={(v) => onChange({ days: v ? Number(v) : undefined })}
            keyboardType="numeric"
            placeholder={isStep ? "e.g. 15" : "e.g. 7"}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[styles.inputBox, styles.flexBox]}
          />
          <CustomText style={styles.inlineTextRight}>Days</CustomText>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.half}>
          <CustomText style={styles.fieldLabel}>Price</CustomText>
          <View style={styles.priceInputWrap}>
            <CustomText style={styles.currency}>₹</CustomText>
            <TextInput
              value={Number.isFinite(ticket.price) ? String(ticket.price) : ""}
              onChangeText={(v) => onChange({ price: v === "" ? 0 : Number(v) || 0 })}
              keyboardType="numeric"
              placeholder="e.g. 499"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.priceInput}
            />
          </View>
        </View>
        <View style={styles.half}>
          <CustomText style={styles.fieldLabel}>Capacity</CustomText>
          <TextInput
            value={ticket.capacity != null ? String(ticket.capacity) : ""}
            onChangeText={(v) => onChange({ capacity: v ? Number(v) : undefined })}
            keyboardType="numeric"
            placeholder="e.g. 100"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.inputBox}
          />
        </View>
      </View>
    </LinearGradient>
  );
});

CreateTicketCard.displayName = "CreateTicketCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 24,
    paddingTop: 32,
    marginBottom: 16,
  },
  header: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  inputBox: {
    ...fontTextStyles.eighteenNormalBlack,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    color: "#FFF",
    paddingHorizontal: 14,
  },
  priceInputWrap: {
    height: 48,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  currency: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
  priceInput: {
    ...fontTextStyles.eighteenNormalBlack,
    flex: 1,
    color: "#FFF",
    paddingLeft: 8,
    paddingVertical: 0,
  },
  benefitsContainer: {
    height: 120,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    position: "relative",
  },
  benefitsInput: {
    ...fontTextStyles.eighteenNormalBlack,
    flex: 1,
    color: "#FFF",
    padding: 14,
    paddingBottom: 40,
    textAlignVertical: "top",
  },
  uploadRow: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imagePreviewWrap: {
    position: "relative",
  },
  imagePreview: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
  },
  uploadBtn: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
  },
  uploadBtnText: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#000000",
    fontWeight: "500",
  },
  uploadText: {
    fontSize: 12,
    color: "#000000",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inlineTextLeft: {
    fontSize: 14,
    color: "#FFFFFF",
    marginRight: 8,
  },
  inlineTextMid: {
    fontSize: 14,
    color: "#FFFFFF",
    marginHorizontal: 8,
  },
  inlineTextRight: {
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  flexBox: {
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 0,
  },
  half: {
    flex: 1,
  },
});

export default CreateTicketCard;

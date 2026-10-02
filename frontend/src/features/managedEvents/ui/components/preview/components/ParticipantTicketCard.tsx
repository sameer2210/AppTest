import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";

export type ParticipantTicket = {
  id: string;
  name: string;
  ticketCode: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  benefits?: string;
  /** Optional free-text description under benefits. */
  description?: string | null;
  /** Profile image URL or bitmoji key (`bt1`…). */
  avatarUri?: string | null;
  /** Used to pick a deterministic bitmoji when avatarUri is missing. */
  avatarUid?: string | null;
  /**
   * QR payload string (e.g. `STRON|TKT-…|eventKey|uid`).
   * Kept as `qrUri` for existing navigation params.
   */
  qrUri?: string | null;
};

type Props = {
  ticket: ParticipantTicket;
  /** When set, empty description shows an "Add Now" action. */
  onAddDescription?: () => void;
};

/**
 * In-person / participant ticket card — blue gradient, QR panel, benefits + description.
 */
const ParticipantTicketCard = ({ ticket, onAddDescription }: Props) => {
  const benefits = ticket.benefits?.trim() || "Certificates, Bib Numbers, Refreshments";
  const description = ticket.description?.trim() || "";
  const qrValue =
    (ticket.qrUri && ticket.qrUri.trim()) ||
    `STRON|${ticket.ticketCode.replace(/^#/, "")}|${ticket.id}`;
  const avatarSource = getProfileImageSource(ticket.avatarUri, ticket.avatarUid || undefined);

  return (
    <LinearGradient
      colors={["#3573FA", "#1B47A4", "#163A86"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <CustomText
            style={styles.ticketName}
            numberOfLines={2}
          >
            {ticket.name}
          </CustomText>
          <CustomText style={styles.ticketCode}>
            {ticket.ticketCode.startsWith("#") ? ticket.ticketCode : `#${ticket.ticketCode}`}
          </CustomText>

          <View style={styles.meta}>
            <CustomText style={styles.metaLine}>
              Date : {ticket.dateLabel}
            </CustomText>
            <CustomText style={styles.metaLine}>
              Time : {ticket.timeLabel}
            </CustomText>
            <CustomText style={styles.metaLine}>
              Price : {ticket.priceLabel}
            </CustomText>
          </View>
        </View>

        <View style={styles.media}>
          <QRCode
            value={qrValue}
            size={112}
            color="#0B0C0E"
            backgroundColor="#FFFFFF"
            quietZone={8}
            ecl="M"
            logo={avatarSource}
            logoSize={32}
            logoMargin={2}
            logoBorderRadius={16}
            logoBackgroundColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <CustomText style={styles.benefitsText}>{benefits}</CustomText>
        {description ? (
          <CustomText style={styles.descriptionText}>
            {description}
          </CustomText>
        ) : (
          <CustomText style={styles.missingDescText}>
            Description is not provided so it will not display on page
            {onAddDescription ? ", " : "."}
            {onAddDescription ? (
              <CustomText
                style={styles.addNowLink}
                onPress={onAddDescription}
              >
                Add Now
              </CustomText>
            ) : null}
          </CustomText>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    minHeight: 250,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  copy: {
    flex: 1,
    paddingRight: 4,
  },
  ticketName: {
    fontSize: 24,
    lineHeight: 28,
    color: "#FFFFFF",
  },
  ticketCode: {
    marginTop: 4,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
  },
  meta: {
    marginTop: 16,
    gap: 2,
  },
  metaLine: {
    fontSize: 15,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  media: {
    width: 128,
    height: 128,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  footer: {
    marginTop: 18,
  },
  benefitsText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.9)",
  },
  descriptionText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.75)",
  },
  missingDescText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.7)",
  },
  addNowLink: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9EC5FF",
  },
});

export default ParticipantTicketCard;

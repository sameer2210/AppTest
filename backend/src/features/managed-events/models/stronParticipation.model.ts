// StronParticipation: one row per (participant, event) once a ticket is paid.
// Holds the money snapshot, the ticket, and per-format progress used by leaderboards.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { STRON_FORMAT_VALUES } from "../services/stronFormats.service.js";

const participationSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    eventKey: { type: String, required: true, index: true },
    format: { type: String, enum: STRON_FORMAT_VALUES, required: true },
    organizerUid: { type: String, required: true, index: true },

    // Ticket + payment linkage (mirrors the shared Registration/Transaction).
    ticketTypeId: { type: String, required: true },
    ticketLabel: { type: String, default: null },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
      index: true,
    },
    razorpayOrderId: { type: String, default: null, index: true },
    ticketNumber: { type: String, default: null },
    qrCode: { type: String, default: null },

    // Money snapshot at purchase time (rupees).
    ticketPrice: { type: Number, default: 0 },
    gatewayFee: { type: Number, default: 0 },
    totalCharged: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    organizerNet: { type: Number, default: 0 },

    status: {
      type: String,
      enum: [
        "registered",
        "active",
        "completed",
        "expired",
        "eliminated",
        "cancelled",
        "refunded",
      ],
      default: "registered",
      index: true,
    },

    enrolledAt: { type: Date, default: Date.now },
    activatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },

    // Steps the participant already had on the day they joined; subtracted on the
    // first daily accrual so marathon/step progress only counts steps after enrolment.
    baselineSteps: { type: Number, default: 0 },
    baselineDayKey: { type: String, default: null },

    // Marathon: settled steps accrue daily until the deadline; first to target wins.
    accumulatedSteps: { type: Number, default: 0 },
    targetSteps: { type: Number, default: null },
    distanceKm: { type: Number, default: null },
    daysAllowed: { type: Number, default: null },
    deadlineDayKey: { type: String, default: null },
    completionOrder: { type: Number, default: null },

    // Step Challenge: count of days that met the daily target.
    requiredDays: { type: Number, default: null },
    dailyStepTarget: { type: Number, default: null },
    successfulDays: { type: Number, default: 0 },
    /** IST day keys that already counted toward successfulDays (idempotent awards). */
    successfulDayKeys: { type: [String], default: [] },
    /**
     * Per-event, per-IST-day credited steps (after that day's event anchor).
     * Key = "YYYY-MM-DD", value = event-only steps for that day.
     */
    eventDaySteps: { type: Map, of: Number, default: () => new Map() },
    /**
     * Phone step count at first credit for each IST day (per event).
     * todayEventSteps = max(0, phoneToday − eventDayAnchors[today]).
     */
    eventDayAnchors: { type: Map, of: Number, default: () => new Map() },
    /** Last IST day written into eventDaySteps / live tracking. */
    trackingDayKey: { type: String, default: null },

    // Face Off: daily wins rolled up per ISO week + running total.
    weeklyWins: { type: Map, of: Number, default: {} },
    totalWins: { type: Number, default: 0 },

    // King of the Hill: cumulative time (seconds) spent at the top of the group.
    totalKingSeconds: { type: Number, default: 0 },

    // Generic ranking + settle bookkeeping.
    leaderboardSteps: { type: Number, default: 0 },
    resultRank: { type: Number, default: null },
    isWinner: { type: Boolean, default: false },
    // Guards daily accrual from running twice for the same IST day.
    lastSettledDayKey: { type: String, default: null },
    // Last successful applyLive from user step sync (ops / participant UI).
    lastSyncedAt: { type: Date, default: null },

    // Event attendance via Connect QR ticket scan.
    checkedInAt: { type: Date, default: null, index: true },
    checkedInByUid: { type: String, default: null },

    /** Answers to organizer-requested registration fields (label → value). */
    participantInfo: {
      type: [
        {
          field: { type: String, required: true },
          value: { type: String, default: "" },
        },
      ],
      default: [],
    },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// A user has at most one live participation per event.
participationSchema.index({ uid: 1, eventKey: 1 }, { unique: true });
// Cheap lookup for step-sync apply across a user's active events.
participationSchema.index({ uid: 1, status: 1 });

export type StronParticipation = InferSchemaType<typeof participationSchema>;
export default registerModel("StronParticipation", participationSchema);

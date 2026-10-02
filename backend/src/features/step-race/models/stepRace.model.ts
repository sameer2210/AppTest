import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const stepRaceSchema = new Schema({
  raceId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  opponent: {
    uid: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    profileImageUrl: {
      type: String,
    },
    type: {
      type: String,
      enum: ["real", "shadow", "random"],
      required: true,
    },
    currentSteps: {
      type: Number,
      required: true,
    },
    shadowData: {
      uid: String,
      username: String,
      profileImageUrl: String,
      bestStepCount: Number,
      originalBestStepCount: Number,
      lastActiveDate: Date,
      decayRate: {
        type: Number,
        default: 0.10,
      },
      isOnline: {
        type: Boolean,
        default: false,
      },
      bestPaceSeconds: {
        type: Number,
        default: 600, // 10:00 per km
      },
    },
  },
  targetSteps: {
    type: Number,
    default: 1000,
  },
  opponentPaceSeconds: {
    type: Number,
    default: 600, // 10:00 per km
  },
  userTimeSeconds: {
    type: Number,
    default: null,
  },
  startSteps: {
    type: Number,
    default: 0,
  },
  userSteps: {
    type: Number,
    default: 0,
  },
  opponentSteps: {
    type: Number,
    default: 1000,
  },
  status: {
    type: String,
    enum: ["lobby", "searching", "active", "completed", "expired"],
    default: "active",
  },
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
    required: true,
    index: true,
  },
  duration: {
    type: Number,
    default: 24, // hours
  },
  winner: {
    type: String,
    enum: ["user", "opponent", "draw"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
stepRaceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

stepRaceSchema.index({ "opponent.uid": 1, "opponent.type": 1, createdAt: -1 });
stepRaceSchema.index({ userId: 1, createdAt: -1 });

export type StepRace = InferSchemaType<typeof stepRaceSchema>;
const StepRaceModel = registerModel("StepRace", stepRaceSchema);

export default StepRaceModel;

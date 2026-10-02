import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const brandPageVisitSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    dateIST: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueVisitorHashes: {
      type: [String],
      default: [],
    },
    memberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Member" }],
      default: [],
    },
  },
  { timestamps: true },
);

brandPageVisitSchema.index({ businessId: 1, dateIST: 1 }, { unique: true });

export type BrandPageVisit = InferSchemaType<typeof brandPageVisitSchema>;
const BrandPageVisit = registerModel("BrandPageVisit", brandPageVisitSchema);

export default BrandPageVisit;

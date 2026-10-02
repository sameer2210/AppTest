import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  type Schema,
  type Types,
} from "mongoose";

/** Register a model once (safe for hot reload / tests). */
export function registerModel<TSchema extends Schema>(
  name: string,
  schema: TSchema,
): Model<InferSchemaType<TSchema>> {
  const existing = mongoose.models[name] as
    | Model<InferSchemaType<TSchema>>
    | undefined;
  if (existing) return existing;
  return mongoose.model(name, schema) as Model<InferSchemaType<TSchema>>;
}

/** Attaches MongoDB metadata (_id, timestamps) to an inferred schema type */
export type WithMongoId<T> = T & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type { HydratedDocument, InferSchemaType, Model, Schema, Types };


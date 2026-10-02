import UserModel from "../models/user.model.js";
import type { Timestamp } from "firebase-admin/firestore";
import { db } from "../../../config/firebase.js";

export const syncAllUsersFromFirestore = async () => {
  const usersSnapshot = await db.collection("users").get();

  if (usersSnapshot.empty) {
    return {
      message: "No users found in Firestore to sync.",
      syncedUsers: 0,
      newUsersCreated: 0,
      existingUsersUpdated: 0,
    };
  }

  const bulkOps = usersSnapshot.docs.map((doc) => {
    const firestoreData = doc.data() as {
      userId?: string;
      email?: string;
      username?: string;
      dob?: Timestamp;
      gender?: string;
      weight?: number;
      height?: number;
      contactNo?: string;
      address?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      pinCode?: string | number | null;
      profileImageUrl?: string;
      stepGoal?: number;
      todaysStepCount?: number;
    };
    const dobAsDate = firestoreData.dob ? firestoreData.dob.toDate() : null;
    const mongoUpdateData = {
      uid: firestoreData.userId,
      email: firestoreData.email,
      username: firestoreData.username,
      dob: dobAsDate,
      gender: firestoreData.gender,
      weight: firestoreData.weight,
      height: firestoreData.height,
      contactNo: firestoreData.contactNo,
      address: firestoreData.address ?? null,
      addressLine1: firestoreData.addressLine1 ?? null,
      city: firestoreData.city ?? null,
      state: firestoreData.state ?? null,
      pinCode: firestoreData.pinCode?.toString() ?? null,
      profileImageUrl: firestoreData.profileImageUrl,
      stepGoal: firestoreData.stepGoal,
      todaysStepCount: firestoreData.todaysStepCount,
    };
    return {
      updateOne: {
        filter: { uid: firestoreData.userId },
        update: {
          $set: mongoUpdateData,
          $setOnInsert: {
            coins: 0,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await UserModel.bulkWrite(bulkOps);
  return {
    message: "Bulk sync complete.",
    syncedUsers: result.upsertedCount + result.modifiedCount,
    newUsersCreated: result.upsertedCount,
    existingUsersUpdated: result.modifiedCount,
  };
};

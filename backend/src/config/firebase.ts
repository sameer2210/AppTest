import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountBase64) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in environment.");
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("ascii"),
  ) as admin.ServiceAccount;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT format: ${message}`);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.firestore();

export { admin, db };

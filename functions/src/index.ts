import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// مؤقتاً: function بسيطة بس عشان الـ build يشتغل
export const ping = functions.https.onRequest((req, res) => {
  res.status(200).send("Shagaf backend is working");
});

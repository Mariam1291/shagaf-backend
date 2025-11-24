// =====================[ IMPORTS + SETUP ]=====================
// (مريم بس اللي تلمس الجزء ده)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // يخلي الـ Admin SDK يشتغل على نفس الـ project بتاع الـ emulator / Firebase
    projectId: process.env.GCLOUD_PROJECT,
  });
}

const db = admin.firestore();


// =====================[ BOOKING APIs – Hana ]=====================


// -------------------- 1) Get Available Slots --------------------

export const getAvailableSlots = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const placeId = req.query.placeId as string;
  const branchId = req.query.branchId as string;
  const date = req.query.date as string;

  if (!placeId || !branchId || !date) {
    res.status(400).json({
      message: "placeId, branchId and date are required",
    });
    return;
  }

  try {
    // 🔹 1: هات كل الحجوزات لنفس المكان + نفس الفرع + نفس اليوم
    const snapshot = await db
      .collection("bookings")
      .where("place_id", "==", placeId)
      .where("branch_id", "==", branchId)
      .where("date", "==", date)
      .get();

    const booked = snapshot.docs.map((doc) => doc.data());

    // 🔹 2: slots الأساسية (مؤقتًا ثابتة)
    const allSlots = [
      { start_time: "10:00", end_time: "12:00" },
      { start_time: "12:00", end_time: "14:00" },
      { start_time: "14:00", end_time: "16:00" },
      { start_time: "16:00", end_time: "18:00" },
    ];

    // 🔹 3: شيل الـ slots المحجوزة (لنفس المكان والفرع)
    const availableSlots = allSlots.filter(
      (slot) =>
        !booked.some(
          (booking: any) =>
            booking.start_time === slot.start_time &&
            booking.end_time === slot.end_time
        )
    );

    res.status(200).json({
      place_id: placeId,
      branch_id: branchId,
      date,
      available_slots: availableSlots,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// -------------------- 2) Checkout (Create Booking) --------------------

export const checkout = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { user_id, items } = req.body || {};

  if (!user_id || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "user_id and items are required" });
    return;
  }

  try {
    let total = 0;
    const bookings: any[] = [];

    for (const item of items) {
      // 🛑 games للعرض بس → متتحجزش
      if (item.type === "game") {
        continue;
      }

      // 🔹 سعر مؤقت ثابت (ممكن يتعدل بعدين حسب place/room)
      const price = 200;

      const docRef = await db.collection("bookings").add({
        user_id,
        type: item.type,             // room / place / ...
        branch_id: item.branch_id,
        place_id: item.place_id,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        people_count: item.people_count,
        price: price,
        status: "awaiting_deposit",
        payment_status: "waiting_proof",
        created_at: new Date().toISOString(),
      });

      total += price;

      bookings.push({
        booking_id: docRef.id,
        ...item,
        price,
      });
    }

    res.status(200).json({
      success: true,
      total_price: total,
      deposit_amount: total * 0.5,
      currency: "EGP",
      bookings,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// -------------------- 3) Get My Bookings --------------------

export const getMyBookings = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const userId = req.query.userId as string;

  if (!userId) {
    res.status(400).json({ message: "userId is required" });
    return;
  }

  try {
    const snapshot = await db
      .collection("bookings")
      .where("user_id", "==", userId)
      .get();

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ bookings });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// =====================[ DATA APIs – Mariam ]=====================

// ---------- GET /getBranches ----------
export const getBranches = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // بنجيب الفروع الـ active بس
    const snapshot = await db
      .collection("branches")
      .where("is_active", "==", true)
      .get();

    const branches = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ branches });
    return;
  } catch (err) {
    console.error("getBranches error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- GET /getRooms ----------
// global rooms (نفسها لكل الفروع)
export const getRooms = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const snapshot = await db
      .collection("rooms")
      .where("is_active", "==", true)
      .get();

    const rooms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ rooms });
    return;
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- GET /getPlaces ----------
// places still per branch (indoor / outdoor)
export const getPlaces = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const branchId = req.query.branchId as string;
  const type = req.query.type as string | undefined; // "indoor" | "outdoor"

  if (!branchId) {
    res.status(400).json({ message: "branchId is required" });
    return;
  }

  try {
    let query: FirebaseFirestore.Query = db
      .collection("places")
      .where("branch_id", "==", branchId);

    if (type) {
      query = query.where("type", "==", type);
    }

    const snapshot = await query.get();

    const places = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ places });
    return;
  } catch (err) {
    console.error("getPlaces error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- GET /getGames ----------
// global games (نفسها لكل الفروع) – للعرض فقط
export const getGames = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const snapshot = await db
      .collection("games")
      .where("is_active", "==", true)
      .get();

    const games = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ games });
    return;
  } catch (err) {
    console.error("getGames error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- GET /getOffers ----------
export const getOffers = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const branchId = req.query.branchId as string | undefined;

  try {
    let query: FirebaseFirestore.Query = db
      .collection("offers")
      .where("is_active", "==", true);

    if (branchId) {
      // يا إما العرض بتاع فرع معين
      // يا إما عرض عام (branch_id = null)
      query = query.where("branch_id", "in", [branchId, null]);
    }

    const snapshot = await query.get();

    const offers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ offers });
    return;
  } catch (err) {
    console.error("getOffers error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// =====================[ PAYMENTS & NOTIFICATIONS – Rahma ]=====================

export const uploadPaymentProof = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const {
    user_id,
    booking_ids,
    method,
    payer_phone,
    amount,
    screenshot_url,
  } = req.body || {};

  if (
    !user_id ||
    !Array.isArray(booking_ids) ||
    booking_ids.length === 0 ||
    !method ||
    !payer_phone ||
    !amount ||
    !screenshot_url
  ) {
    res.status(400).json({
      message:
        "user_id, booking_ids, method, payer_phone, amount, screenshot_url are required",
    });
    return;
  }

  try {
    // 1) نتأكد إن كل الـ bookings دي فعلاً بتاعة نفس اليوزر
    const bookingsSnap = await db
      .collection("bookings")
      .where(admin.firestore.FieldPath.documentId(), "in", booking_ids)
      .get();

    if (bookingsSnap.empty || bookingsSnap.size !== booking_ids.length) {
      res.status(400).json({
        message: "Some bookings not found",
      });
      return;
    }

    const invalidBooking = bookingsSnap.docs.find(
      (doc) => doc.data().user_id !== user_id
    );

    if (invalidBooking) {
      res
        .status(403)
        .json({ message: "One or more bookings do not belong to this user" });
      return;
    }

    // 2) نكتب payment_proof
    const proofRef = await db.collection("payment_proofs").add({
      user_id,
      booking_ids,
      method,
      payer_phone,
      amount,
      screenshot_url,
      status: "pending", // pending | approved | rejected
      created_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
    });

    // 3) نـ update الـ bookings → payment_status = "proof_submitted"
    const batch = db.batch();
    bookingsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        payment_status: "proof_submitted",
      });
    });
    await batch.commit();

    res.status(200).json({
      success: true,
      proof_id: proofRef.id,
      status: "pending",
    });
    return;
  } catch (err) {
    console.error("uploadPaymentProof error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- POST /admin/approvePaymentProof?proofId=xxx ----------
export const approvePaymentProof = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const proofId = req.query.proofId as string;
  const adminId = req.body?.admin_id || "manual_admin"; // مؤقتًا

  if (!proofId) {
    res.status(400).json({ message: "proofId is required" });
    return;
  }

  try {
    const proofRef = db.collection("payment_proofs").doc(proofId);
    const proofSnap = await proofRef.get();

    if (!proofSnap.exists) {
      res.status(404).json({ message: "payment_proof not found" });
      return;
    }

    const proof = proofSnap.data() as any;

    if (proof.status !== "pending") {
      res.status(400).json({ message: "Payment proof already reviewed" });
      return;
    }

    const bookingIds: string[] = proof.booking_ids || [];
    const userId = proof.user_id;

    // نجيب الـ bookings
    const bookingsSnap = await db
      .collection("bookings")
      .where(admin.firestore.FieldPath.documentId(), "in", bookingIds)
      .get();

    const batch = db.batch();

    // 1) نحدّث proof
    batch.update(proofRef, {
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    });

    // 2) نحدّث كل booking → confirmed + deposit_paid
    bookingsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "confirmed",
        payment_status: "deposit_paid",
      });
    });

    // 3) نعمل notification لليوزر
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      user_id: userId,
      type: "booking_confirmed",
      title: "تم تأكيد حجزك ✅",
      body: "تم مراجعة الدفع بالديبوزيت وتأكيد حجزك.",
      booking_ids: bookingIds,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: "Payment proof approved and bookings confirmed",
    });
    return;
  } catch (err) {
    console.error("approvePaymentProof error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- POST /admin/rejectPaymentProof?proofId=xxx ----------
export const rejectPaymentProof = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const proofId = req.query.proofId as string;
  const adminId = req.body?.admin_id || "manual_admin";
  const reason = req.body?.reason || "Payment proof rejected";

  if (!proofId) {
    res.status(400).json({ message: "proofId is required" });
    return;
  }

  try {
    const proofRef = db.collection("payment_proofs").doc(proofId);
    const proofSnap = await proofRef.get();

    if (!proofSnap.exists) {
      res.status(404).json({ message: "payment_proof not found" });
      return;
    }

    const proof = proofSnap.data() as any;

    if (proof.status !== "pending") {
      res.status(400).json({ message: "Payment proof already reviewed" });
      return;
    }

    const bookingIds: string[] = proof.booking_ids || [];
    const userId = proof.user_id;

    const bookingsSnap = await db
      .collection("bookings")
      .where(admin.firestore.FieldPath.documentId(), "in", bookingIds)
      .get();

    const batch = db.batch();

    // 1) نحدّث proof
    batch.update(proofRef, {
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    });

    // 2) نرجّع الـ bookings لحالة waiting_proof تاني
    bookingsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        payment_status: "waiting_proof",
      });
    });

    // 3) notification لليوزر
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      user_id: userId,
      type: "payment_rejected",
      title: "تم رفض إثبات الدفع ❌",
      body: reason,
      booking_ids: bookingIds,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: "Payment proof rejected and user notified",
    });
    return;
  } catch (err) {
    console.error("rejectPaymentProof error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// ---------- GET /getNotifications?userId=...&onlyUnread=true ----------
export const getNotifications = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const userId = req.query.userId as string;
  const onlyUnread = req.query.onlyUnread === "true";

  if (!userId) {
    res.status(400).json({ message: "userId is required" });
    return;
  }

  try {
    let query: FirebaseFirestore.Query = db
      .collection("notifications")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc");

    if (onlyUnread) {
      query = query.where("is_read", "==", false);
    }

    const snapshot = await query.get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ notifications });
    return;
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});


// =====================[ TEST FUNCTION ]=====================

export const ping = functions.https.onRequest((req, res) => {
  res.status(200).send("Shagaf backend is working ✅");
});

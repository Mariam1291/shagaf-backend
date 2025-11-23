// =====================[ IMPORTS + SETUP ]=====================
// (مريم بس اللي تلمس الجزء ده)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}



// =====================[ BOOKING APIs – Hana ]=====================
// هنا هتكمّل Hana اللوجيك بنفسها

// GET /getAvailableSlots?placeId=...&date=YYYY-MM-DD
export const getAvailableSlots = functions.https.onRequest((req, res) => {
  // TODO: Hana تكمل هنا
  res.status(200).json({
    message: "TODO: implement getAvailableSlots",
    example_params: {
      placeId: "room1",
      date: "2025-11-25",
    },
  });
});

// POST /checkout
export const checkout = functions.https.onRequest((req, res) => {
  // TODO: Hana تكمل هنا
  res.status(200).json({
    message: "TODO: implement checkout",
    expected_body_example: {
      items: [
        {
          place_id: "room1",
          branch_id: "shagaf_nasr",
          type: "room",
          date: "2025-11-25",
          start_time: "12:00",
          end_time: "14:00",
          people_count: 3,
        },
      ],
    },
  });
});

// GET /getMyBookings
export const getMyBookings = functions.https.onRequest((req, res) => {
  // TODO: Hana تكمل هنا
  res.status(200).json({
    message: "TODO: implement getMyBookings",
    bookings: [],
  });
});



// =====================[ DATA APIs – Mariam ]=====================
// هنا شغل مريم: فروع / أماكن / Rooms / Games / Offers

export const getBranches = functions.https.onRequest((req, res) => {
  // TODO: Mariam تجيب الداتا من Firestore بعدين
  res.status(200).json({
    message: "TODO: implement getBranches",
    branches: [
      { id: "shagaf_nasr", name: "Shagaf Nasr City" },
      { id: "shagaf_maadi", name: "Shagaf Maadi" },
    ],
  });
});

// بعدين تزودي:
// export const getPlaces = ...
// export const getRooms = ...
// export const getOffers = ...
// export const getGames = ...



// =====================[ PAYMENTS & NOTIFICATIONS – Rahma ]=====================

export const uploadPaymentProof = functions.https.onRequest((req, res) => {
  // TODO: Rahma تكمل هنا (استقبال screenshot link أو ref)
  res.status(200).json({
    message: "TODO: implement uploadPaymentProof",
  });
});

export const getNotifications = functions.https.onRequest((req, res) => {
  // TODO: Rahma تكمل هنا
  res.status(200).json({
    message: "TODO: implement getNotifications",
    notifications: [],
  });
});



// =====================[ TEST FUNCTION ]=====================

export const ping = functions.https.onRequest((req, res) => {
  res.status(200).send("Shagaf backend is working ✅");
});

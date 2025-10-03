
import express from "express";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

const router = express.Router();

router.get("/orders", async (req, res) => {
  try {
    const ordersCol = collection(db, "orders");
    const snapshot = await getDocs(ordersCol);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

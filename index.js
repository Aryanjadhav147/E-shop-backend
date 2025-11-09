// index.js
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import admin from "firebase-admin";
import ordersRouter from "./orders.js";

// ------------------ 🔹 Load Environment Variables ------------------
dotenv.config();

console.log("🔑 RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Loaded" : "Missing");
console.log("🔒 RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Loaded" : "Missing");

const app = express();

// ------------------ 🔹 CORS SETUP ------------------
const allowedOrigins = [
  "http://localhost:5173", // frontend dev
  process.env.FRONTEND_URL, // production (optional)
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// ------------------ 🔹 FIREBASE ADMIN INIT ------------------
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// ------------------ 🔹 RAZORPAY INIT ------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------ 🔹 MIDDLEWARES ------------------
const checkAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin)
      return res.status(403).json({ error: "Admin access required" });

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// =========================================================
// 🔸 AUTH ROUTES
// =========================================================
app.post("/signup", async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersCol = collection(db, "users");
    const q = query(usersCol, where("username", "==", username));
    const userSnap = await getDocs(q);

    if (!userSnap.empty)
      return res.status(400).json({ success: false, error: "User already exists" });

    const id = Date.now().toString();
    await setDoc(doc(db, "users", id), {
      username,
      password: hashedPassword,
      isAdmin: !!isAdmin,
    });

    res.json({ success: true, user: { id, username, isAdmin: !!isAdmin } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const q = query(collection(db, "users"), where("username", "==", username));
    const userSnap = await getDocs(q);

    if (userSnap.empty)
      return res.status(400).json({ success: false, error: "User not found" });

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();

    const match = await bcrypt.compare(password, userData.password);
    if (!match)
      return res.status(400).json({ success: false, error: "Invalid password" });

    const token = jwt.sign(
      {
        id: userDoc.id,
        username: userData.username,
        isAdmin: userData.isAdmin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      user: {
        id: userDoc.id,
        username: userData.username,
        isAdmin: userData.isAdmin || false,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================
// 🔸 PRODUCTS ROUTES
// =========================================================
app.get("/products", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const productSnap = await getDoc(doc(db, "products", req.params.id));
    if (!productSnap.exists())
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ id: productSnap.id, ...productSnap.data() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================
// 🔸 CART ROUTES
// =========================================================
app.post("/cart", async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;
    const cartRef = doc(db, "cart", `${user_id}_${product_id}`);
    await setDoc(cartRef, { user_id, product_id, quantity });
    res.json({ success: true, message: "Cart updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/cart/:userId", async (req, res) => {
  try {
    const q = query(collection(db, "cart"), where("user_id", "==", req.params.userId));
    const snapshot = await getDocs(q);
    const cartItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(cartItems);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================
// 🔸 ORDERS ROUTES
// =========================================================
app.post("/orders", async (req, res) => {
  try {
    const { user_id, cart, address, paymentMode, onlineMethod, paymentDetails } = req.body;

    for (const item of cart) {
      const id = `${user_id}_${item.product_id}_${Date.now()}`;
      await setDoc(doc(db, "orders", id), {
        user_id,
        product_id: item.product_id,
        quantity: item.quantity,
        status: "pending",
        address,
        payment_method:
          paymentMode === "Online"
            ? `${paymentMode} - ${onlineMethod} (${paymentDetails})`
            : paymentMode,
      });
    }

    res.json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/orders/:userId", async (req, res) => {
  try {
    const q = query(collection(db, "orders"), where("user_id", "==", req.params.userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================
// 🔸 RAZORPAY PAYMENT ROUTES
// =========================================================
app.get("/api/payment/test", (req, res) => {
  res.json({
    message: "✅ Payment route working fine!",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/payment/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    res.json({ success: true, message: "Payment verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

// =========================================================
// 🔸 ADMIN ROUTES
// =========================================================
app.use("/api/admin/orders", checkAdmin, ordersRouter);

// =========================================================
// 🔸 SERVER START
// =========================================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  ✅ SERVER RUNNING SUCCESSFULLY        ║
╚════════════════════════════════════════╝
🌐 URL: http://localhost:${PORT}
📦 CORS allowed for: ${allowedOrigins.join(", ")}
⚙️ Payment test: GET /api/payment/test
`);
});

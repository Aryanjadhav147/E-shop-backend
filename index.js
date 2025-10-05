// index.js
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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
import ordersRouter from "./orders.js"; // admin orders router

dotenv.config();

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// 🔹 Middleware: Check Admin
const checkAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: "You must be admin" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};


// --------- AUTH ROUTES ---------
// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersCol = collection(db, "users");
    const q = query(usersCol, where("username", "==", username));
    const userSnap = await getDocs(q);

    if (!userSnap.empty)
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });

    const id = Date.now().toString();
    await setDoc(doc(db, "users", id), {
      username,
      password: hashedPassword,
      isAdmin: isAdmin || false, // default false
    });

    res.json({ success: true, user: { id, username, isAdmin: isAdmin || false } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const usersCol = collection(db, "users");
    const q = query(usersCol, where("username", "==", username));
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

// Admin Dashboard
aapp.get("/api/admin/orders", checkAdmin, async (req, res) => {
  const orders = await getAllOrdersFromDB(); // example
  res.json(orders);
});



// --------- PRODUCTS ROUTES ---------
app.get("/products", async (req, res) => {
  try {
    const productsCol = collection(db, "products");
    const snapshot = await getDocs(productsCol);
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
    const { id } = req.params;
    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists())
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json({ id: productSnap.id, ...productSnap.data() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------- CART ROUTES ---------
app.post("/cart", async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;
    const cartRef = doc(db, "cart", `${user_id}_${product_id}`);
    await setDoc(cartRef, { user_id, product_id, quantity });
    res.json({ success: true, message: "Cart updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cartCol = collection(db, "cart");
    const q = query(cartCol, where("user_id", "==", userId));
    const snapshot = await getDocs(q);
    const cartItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(cartItems);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- ORDERS ROUTES ---------
app.post("/orders", async (req, res) => {
  try {
    const { user_id, cart, address, paymentMode, onlineMethod, paymentDetails } = req.body;

    for (let item of cart) {
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
    const { userId } = req.params;
    const ordersCol = collection(db, "orders");
    const q = query(ordersCol, where("user_id", "==", userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- ADMIN ORDERS ---------
app.use("/api/admin/orders", ordersRouter);

// --------- START SERVER ---------
const PORT = process.env.PORT || 3200;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { db } from "./firebaseConfig.js";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// --------- AUTH ROUTES ---------

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("username", "==", username));
    const userSnap = await getDocs(q);

    if (!userSnap.empty) {
      return res.status(400).json({ success: false, error: "User already exists" });
    }

    // Add new user
    const id = Date.now().toString(); // simple unique id
    await setDoc(doc(db, "users", id), { username, password: hashedPassword });

    res.json({ success: true, user: { id, username } });
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

    if (userSnap.empty) return res.status(400).json({ success: false, error: "User not found" });

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();

    const match = await bcrypt.compare(password, userData.password);
    if (!match) return res.status(400).json({ success: false, error: "Invalid password" });

    const token = jwt.sign({ id: userDoc.id, username: userData.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ success: true, user: { id: userDoc.id, username: userData.username }, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- PRODUCTS ROUTES ---------

// Get all products
app.get("/products", async (req, res) => {
  try {
    const productsCol = collection(db, "products");
    const snapshot = await getDocs(productsCol);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single product
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ id: productSnap.id, ...productSnap.data() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------- CART ROUTES ---------

// Add/update cart
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

// Get user cart
app.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cartCol = collection(db, "cart");
    const q = query(cartCol, where("user_id", "==", userId));
    const snapshot = await getDocs(q);
    const cartItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(cartItems);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- ORDERS ROUTES ---------

// Place order
app.post("/orders", async (req, res) => {
  try {
    const { user_id, cart, address, paymentMode, onlineMethod, paymentDetails } = req.body;
    const ordersCol = collection(db, "orders");

    for (let item of cart) {
      const id = `${user_id}_${item.product_id}_${Date.now()}`;
      await setDoc(doc(db, "orders", id), {
        user_id,
        product_id: item.product_id,
        quantity: item.quantity,
        status: "pending",
        address,
        payment_method: paymentMode === "Online" ? `${paymentMode} - ${onlineMethod} (${paymentDetails})` : paymentMode,
      });
    }

    res.json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user orders
app.get("/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const ordersCol = collection(db, "orders");
    const q = query(ordersCol, where("user_id", "==", userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- ADDRESSES ROUTES ---------

// Add address
app.post("/addresses", async (req, res) => {
  try {
    const { user_id, address } = req.body;
    const id = `${user_id}_${Date.now()}`;
    await setDoc(doc(db, "addresses", id), { user_id, address });
    res.json({ success: true, message: "Address added" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user addresses
app.get("/addresses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const addressesCol = collection(db, "addresses");
    const q = query(addressesCol, where("user_id", "==", userId));
    const snapshot = await getDocs(q);
    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- START SERVER ---------
app.listen(3200, () => console.log("Server running on http://localhost:3200"));

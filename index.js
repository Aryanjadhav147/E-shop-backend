import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { query, initDB } from "./dbconfig.js";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Initialize DB
initDB();

// --------- AUTH ROUTES ---------

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await query("SELECT * FROM users WHERE username=$1", [username]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ success: false, error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, error: "Invalid password" });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ success: true, user: { id: user.id, username: user.username }, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- PRODUCTS ROUTES ---------

// --------- PRODUCTS ROUTES ---------
app.get("/products", async (req, res) => {
  try {
    const result = await query("SELECT id, name, price, image, category FROM products");
    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// --------- CART ROUTES ---------

// Add to cart
app.post("/cart", async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;
    const existing = await query(
      "SELECT * FROM cart WHERE user_id=$1 AND product_id=$2",
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      await query(
        "UPDATE cart SET quantity=$1 WHERE user_id=$2 AND product_id=$3",
        [quantity, user_id, product_id]
      );
    } else {
      await query(
        "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)",
        [user_id, product_id, quantity]
      );
    }

    res.json({ success: true, message: "Cart updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get cart for a user
app.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      "SELECT c.id, c.quantity, p.name, p.price, p.image FROM cart c JOIN products p ON c.product_id=p.id WHERE c.user_id=$1",
      [userId]
    );
    res.json({ success: true, cart: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------- ORDERS ROUTES ---------

// Place order
// Place an order
app.post("/orders", async (req, res) => {
  try {
    const {
      user_id,
      cart, // array of items: [{ product_id, quantity }]
      address,
      paymentMode,
      onlineMethod,
      paymentDetails,
    } = req.body;

    // Default status
    const status = "pending";

    // Insert each cart item into orders table
    for (let item of cart) {
      await query(
        `INSERT INTO orders 
          (user_id, product_id, quantity, status, address, payment_method)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user_id,
          item.product_id,
          item.quantity,
          status,
          address,
          paymentMode === "Online"
            ? `${paymentMode} - ${onlineMethod} (${paymentDetails})`
            : paymentMode,
        ]
      );
    }

    res.json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get orders for a user
app.get("/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT o.id AS order_id, o.quantity, o.status, p.name AS product_name, p.price AS product_price
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = $1`,
      [userId]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get saved addresses for a user
app.get("/addresses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query("SELECT * FROM user_addresses WHERE user_id=$1", [userId]);
    res.json({ success: true, addresses: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new address
app.post("/addresses", async (req, res) => {
  try {
    const { user_id, address } = req.body;
    const result = await query(
      "INSERT INTO user_addresses (user_id, address) VALUES ($1, $2) RETURNING *",
      [user_id, address]
    );
    res.json({ success: true, address: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get single product by ID
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT id, name, price, image, description,category FROM products WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------- START SERVER ---------
app.listen(3200, () => console.log("Server running on http://localhost:3200"));

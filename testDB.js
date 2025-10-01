import { query } from "./dbconfig.js";

const testDB = async () => {
  try {
    const res = await query("SELECT NOW()");
    console.log("Database connected! Current time:", res.rows[0]);
  } catch (err) {
    console.error("DB connection failed:", err);
  }
};

testDB();

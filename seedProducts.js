import { collection, addDoc } from "firebase/firestore";
import firebaseConfig from "./firebaseConfig.js";
import db from "./firebaseConfig.js";


const products = [
  { id: 61, name: "Wireless Headphones", price: 1356.00, image: "images/headphones1.jpg", category: "Headphones", description: "High-quality wireless headphones for everyday use." },
  { id: 62, name: "Noise Cancelling Headphones", price: 1687.00, image: "images/headphones2.jpg", category: "Headphones", description: "Block out noise with these advanced headphones." },
  { id: 63, name: "Over-Ear Headphones", price: 1747.00, image: "images/headphones3.jpg", category: "Headphones", description: "Comfortable over-ear design with crisp sound." },
  { id: 64, name: "Bass Boost Headphones", price: 1333.00, image: "images/headphones4.jpg", category: "Headphones", description: "Enhanced bass for an immersive music experience." },
  { id: 65, name: "Sport Headphones", price: 1485.00, image: "images/headphones5.jpg", category: "Headphones", description: "Sweat-resistant headphones perfect for workouts." },
  { id: 66, name: "Wireless Gaming Headphones", price: 1239.00, image: "images/headphones6.jpg", category: "Headphones", description: "High-performance gaming headphones with surround sound." },
  { id: 67, name: "Smart Watch Series 5", price: 1187.00, image: "images/watches1.jpg", category: "Watches", description: "Track your fitness and notifications with ease." },
  { id: 68, name: "Fitness Tracker", price: 1557.00, image: "images/watches2.jpg", category: "Watches", description: "Monitor your daily activity and sleep patterns." },
  { id: 69, name: "Luxury Analog Watch", price: 1844.00, image: "images/watches3.jpg", category: "Watches", description: "Elegant design perfect for formal occasions." },
  { id: 70, name: "Digital Sport Watch", price: 1029.00, image: "images/watches4.jpg", category: "Watches", description: "Rugged watch ideal for outdoor sports." },
  { id: 71, name: "Waterproof Watch", price: 1458.00, image: "images/watches5.jpg", category: "Watches", description: "Stay active without worrying about water damage." },
  { id: 72, name: "Health Monitor Watch", price: 1522.00, image: "images/watches6.jpg", category: "Watches", description: "Advanced health tracking and heart rate monitoring." },
  { id: 73, name: "Bluetooth Speaker", price: 1596.00, image: "images/speakers1.jpg", category: "Speakers", description: "Portable Bluetooth speaker with clear sound." },
  { id: 74, name: "Portable Speaker", price: 1598.00, image: "images/speakers2.jpg", category: "Speakers", description: "Take your music anywhere with ease." },
  { id: 75, name: "Home Theater Speaker", price: 1166.00, image: "images/speakers3.jpg", category: "Speakers", description: "Bring cinema-quality sound to your home." },
  { id: 76, name: "Bass Speaker", price: 1772.00, image: "images/speakers4.jpg", category: "Speakers", description: "Deep bass speaker for immersive audio." },
  { id: 77, name: "Outdoor Speaker", price: 1799.00, image: "images/speakers5.jpg", category: "Speakers", description: "Durable speaker for outdoor use." },
  { id: 78, name: "Waterproof Bluetooth Speaker", price: 1962.00, image: "images/speakers6.jpg", category: "Speakers", description: "Waterproof speaker with powerful sound." },
  { id: 79, name: "Gaming Mouse", price: 1085.00, image: "images/mouse1.jpg", category: "Mouse", description: "High precision mouse for gaming enthusiasts." },
  { id: 80, name: "Ergonomic Mouse", price: 1271.00, image: "images/mouse2.jpg", category: "Mouse", description: "Comfortable mouse for long working hours." },
  { id: 81, name: "Wireless Optical Mouse", price: 1902.00, image: "images/mouse3.jpg", category: "Mouse", description: "No wires, smooth and responsive performance." },
  { id: 82, name: "Bluetooth Mouse", price: 1411.00, image: "images/mouse4.jpg", category: "Mouse", description: "Connects via Bluetooth for convenience." },
  { id: 83, name: "RGB Gaming Mouse", price: 1332.00, image: "images/mouse5.jpg", category: "Mouse", description: "Colorful backlight gaming mouse." },
  { id: 84, name: "Compact Travel Mouse", price: 1023.00, image: "images/mouse6.jpg", category: "Mouse", description: "Small and portable mouse for travel." },
  { id: 85, name: "Mechanical Keyboard", price: 1797.00, image: "images/keyboards1.jpg", category: "Keyboards", description: "Durable mechanical keyboard with tactile keys." },
  { id: 86, name: "Wireless Keyboard", price: 1797.00, image: "images/keyboards2.jpg", category: "Keyboards", description: "Type freely without cables getting in the way." },
  { id: 87, name: "Gaming Keyboard", price: 1503.00, image: "images/keyboards3.jpg", category: "Keyboards", description: "RGB backlit keyboard perfect for gaming." },
  { id: 88, name: "Ergonomic Keyboard", price: 1442.00, image: "images/keyboards4.jpg", category: "Keyboards", description: "Designed to reduce strain on your hands." },
  { id: 89, name: "Compact Keyboard", price: 1712.00, image: "images/keyboards5.jpg", category: "Keyboards", description: "Space-saving keyboard for small desks." },
  { id: 90, name: "RGB Backlit Keyboard", price: 1246.00, image: "images/keyboards6.jpg", category: "Keyboards", description: "Bright RGB lights for a stylish setup." }
];

async function seed() {
  try {
    for (let product of products) {
      await addDoc(collection(db, "products"), product);
      console.log(`Added: ${product.name}`);
    }
  } catch (err) {
    console.error("Error adding products:", err);
  }
}

seed();

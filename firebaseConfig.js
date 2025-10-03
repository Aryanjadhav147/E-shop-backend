
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBcid3Ofk8qfjoSXeItIKJZ60aK_kGig2w",
  authDomain: "e-shop-database-e7917.firebaseapp.com",
  projectId: "e-shop-database-e7917",
  storageBucket: "e-shop-database-e7917.appspot.com",
    messagingSenderId: "303890735665",
  appId: "1:303890735665:web:15ed462eca14c44f226b10",
  measurementId: "G-6NXDMRPB5X"
};


const app = initializeApp(firebaseConfig);


const db = getFirestore(app);

export {db};

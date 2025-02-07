import express from 'express';
import cors from 'cors';
import stripePackage from 'stripe';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import fs from 'fs';

// Read and parse the JSON file
const serviceAccount = JSON.parse(fs.readFileSync('./config/serviceAccount.json', 'utf8'));


// Import Firebase client SDK (for auth and Firestore)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Load environment variables
dotenv.config();

// Initialize Stripe
const stripe = stripePackage(process.env.REACT_APP_STRIPE_SECRET_KEY);



// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const adminDb = admin.firestore();

// Firebase client SDK configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase Client SDK
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Initialize Express App
const app = express();

// **Crucial CORS Configuration:**
app.use(cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
    methods: "GET, POST, OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true
}));

// Manually handle preflight requests
app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.sendStatus(204);
});



app.use(express.json());

// Stripe Payment Route
app.post('/create-payment', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow all origins (debug)
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        const { paymentMethodId, appointmentData, usedTokenPoints, finalPrice, userId } = req.body;

        // Input validation - More comprehensive checks
        if (!paymentMethodId || !appointmentData || !finalPrice || !userId || finalPrice <= 0 || !appointmentData.shopName || !appointmentData.date || !appointmentData.time) { // Add more checks for appointmentData
            return res.status(400).json({ success: false, error: 'Missing or invalid required fields' });
        }

       const paymentIntent = await stripe.paymentIntents.create(
    {
        amount: Math.round(finalPrice * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        metadata: { userId, shopName: appointmentData.shopName },
    },
    {
        idempotencyKey: idempotencyKey || `payment-${userId}-${Date.now()}`, // Fallback idempotency key
    }
);


        if (paymentIntent.status !== 'succeeded') {
            console.error("Stripe Payment Error:", paymentIntent.last_payment_error); // Log detailed error
            return res.status(400).json({ success: false, error: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}` });
        }

        // Save appointment to Firestore - Use a transaction for atomicity
        const appointmentRef = adminDb.collection('appointments').doc();

        await adminDb.runTransaction(async (transaction) => {  // Wrap in transaction for atomicity
            transaction.set(appointmentRef, {
                userId,
                appointmentId: appointmentRef.id,
                ...appointmentData,
                originalPrice: appointmentData.price,
                discount: usedTokenPoints || 0,
                finalPrice,
                paymentMethodId,
                chargeId: paymentIntent.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

               // Deduct token points
               if (usedTokenPoints > 0) {
                const userRef = adminDb.collection("users").doc(userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found!");
                const currentTokenPoints = userDoc.data().tokenPoints || 0;
                if (currentTokenPoints < usedTokenPoints) throw new Error("Insufficient token points!");
                transaction.update(userRef, { tokenPoints: admin.firestore.FieldValue.increment(-usedTokenPoints) });
            }
        });

        res.json({ success: true, message: "Payment successful", appointmentId: appointmentRef.id });

    } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


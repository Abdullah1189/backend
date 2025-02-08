import express from 'express';
import cors from 'cors';
const bodyParser = require("body-parser");
const Stripe = require("stripe");

import dotenv from 'dotenv';


// Load environment variables
dotenv.config();

// Initialize Stripe
const stripe = Stripe(process.env.REACT_APP_STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Handle payment confirmation
app.post("/create-payment", async (req, res) => {
    try {
        const { paymentMethodId, finalPrice } = req.body;

        // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(finalPrice * 100), // Convert dollars to cents
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true, // Automatically confirm the payment
        });

        if (paymentIntent.status === "succeeded") {
            return res.json({ success: true, paymentIntentId: paymentIntent.id });
        } else {
            return res.json({ success: false, error: "Payment processing failed" });
        }
    } catch (error) {
        console.error("Error processing payment:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

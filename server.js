import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = Stripe(process.env.REACT_APP_STRIPE_SECRET_KEY);
const app = express();
app.use(express.json()); // Built-in body parser

// Payment API route (Vercel requires /api/)
app.post("/api/create-payment", async (req, res) => {
    try {
        const { paymentMethodId, finalPrice } = req.body;

        // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(finalPrice * 100), // Convert dollars to cents
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true, // Auto-confirm payment
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

// Export the Express app for Vercel
export default app;

const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_51PU3tBFMoGsJIRmWefje5nvZtBIo46rwlijoZLKe4641EL8LecHkSOdRMoLOlPnP35MQSXYpc9Vs1ITkgPXW18Qj00VnHVtxYO");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// // Payment API route (Vercel requires /api/)
// app.post("/api/create-payment", async (req, res) => {
//   try {
//     const { paymentMethodId, finalPrice } = req.body;

//     // Create a PaymentIntent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(finalPrice * 100), // Convert dollars to cents
//       currency: "usd",
//       payment_method: paymentMethodId,
//       confirm: true, // Auto-confirm payment
//     });

//     if (paymentIntent.status === "succeeded") {
//       return res.json({ success: true, paymentIntentId: paymentIntent.id });
//     } else {
//       return res.json({ success: false, error: "Payment processing failed" });
//     }
//   } catch (error) {
//     console.error("Error processing payment:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// });

app.post("/create-payment", async (req, res) => {
  const { paymentMethodId, finalPrice } = req.body;
  console.log("Body", paymentMethodId, finalPrice);

  try {
    // let customer = await findCustomerByEmailInStripe(email);
    // if (!customer) {
    //   console.log("User created new");
    //   customer = await stripe.customers.create({
    //     email: email,
    //   });
    // } else {
    //   console.log("User already exists");
    // }

    // Create an ephemeral key for the customer
    // const ephemeralKey = await stripe.ephemeralKeys.create(
    //   { customer: customer.id },
    //   { apiVersion: "2024-04-10" }
    // );

    // Create a dynamic object for the payment intent parameters
    let paymentIntentParams = {
      amount: Math.round(finalPrice * 100), // Convert price to cents
      currency: "usd",
      //   customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      return_url: "https://facebook.com",
    };

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams
    );
    console.log(paymentIntent.id);
    res.json({
      success: true,
      transactionId: paymentIntent.id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log("Error", error.message);
  }
});

const findCustomerByEmailInStripe = async (email) => {
  const customers = await stripe.customers.list({
    email: email,
    limit: 1, // Assuming emails are unique and fetching only one result
  });
  return customers.data.length > 0 ? customers.data[0] : null;
};

app.listen(3000, () => console.log("Server running on port 3000"));

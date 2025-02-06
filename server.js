const express = require('express');
// const cors = require('cors');

const app = express();
// const PORT = process.env.PORT || 5000;

// Middleware
// app.use(cors());
// app.use(express.json());

// Sample route
app.use('/', (req, res) => {
    res.send('Hello, World! Backend is running.');
});

// Start server
app.listen(5000,console.log(`Server is running on port 5000`)
);

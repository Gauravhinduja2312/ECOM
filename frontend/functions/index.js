const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { getEnv } = require('./utils/env');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors({
  origin: [
    getEnv('FRONTEND_URL', 'https://ecom-52bb3.web.app'),
    'http://localhost:5173',
  ],
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'student-marketplace-firebase-functions' });
});

app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

exports.api = functions.https.onRequest(app);

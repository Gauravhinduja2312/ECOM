require('dotenv').config();
const express = require('express');
const cors = require('cors');

const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const {
  globalLimiter,
  paymentLimiter,
  adminLimiter,
} = require('./middleware/rateLimit');

const app = express();
const port = process.env.PORT || 5000;

const defaultOrigins = [
  'http://localhost:5173',
  'https://ecom-52bb3.web.app',
  'https://ecom-52bb3.firebaseapp.com',
];

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(globalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'student-marketplace-backend' });
});

app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/products', productRoutes);

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

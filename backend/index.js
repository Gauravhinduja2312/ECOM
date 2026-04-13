require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { initSocketService } = require('./services/socketService');

const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const {
  globalLimiter,
  paymentLimiter,
  adminLimiter,
} = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all configured origins
      callback(null, true); 
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

initSocketService(io);

app.set('trust proxy', 1);
const port = process.env.PORT || 5000;

const defaultOrigins = ['http://localhost:5173', 'https://ecom-52bb3.web.app', 'https://ecom-pn0s.onrender.com'];

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
  res.json({ status: 'ok', service: 'student-marketplace-backend', version: '2.2.0', socket: 'active' });
});

app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);

server.listen(port, () => {
  console.log(`Backend with WebSockets running on port ${port}`);
});

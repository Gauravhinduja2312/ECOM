const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProductReviews,
  createReview,
} = require('../controllers/reviewController');

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.post('/', requireAuth, createReview);

module.exports = router;

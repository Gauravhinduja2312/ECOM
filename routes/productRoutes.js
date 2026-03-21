const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { respondToPriceOffer } = require('../controllers/productController');

const router = express.Router();

router.post('/:productId/offer-response', requireAuth, respondToPriceOffer);

module.exports = router;

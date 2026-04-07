const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
	storeProductOffer,
	respondToPriceOffer,
} = require('../controllers/productController');

const router = express.Router();

router.post('/store/offer', requireAuth, storeProductOffer);
router.post('/:productId/offer-response', requireAuth, respondToPriceOffer);

module.exports = router;

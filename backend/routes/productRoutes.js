const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
	createProductOffer,
	respondToPriceOffer,
	getRecommendedProducts,
	getLowStockProducts,
	acquireProductInventory,
} = require('../controllers/productController');

const router = express.Router();

router.post('/store/offer', requireAuth, createProductOffer);
router.post('/:productId/offer-response', requireAuth, respondToPriceOffer);
router.patch('/admin/:productId/acquire', requireAuth, acquireProductInventory);
router.get('/:productId/recommended', getRecommendedProducts);
router.get('/admin/low-stock', requireAuth, getLowStockProducts);

module.exports = router;

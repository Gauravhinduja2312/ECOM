const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
	storeProductOffer,
	respondToPriceOffer,
	getRecommendedProducts,
	getLowStockProducts,
	acquireProductInventory,
} = require('../controllers/productController');

const router = express.Router();

router.post('/store/offer', requireAuth, storeProductOffer);
router.patch('/:productId/respond', requireAuth, respondToPriceOffer);
router.patch('/:productId/acquire', requireAuth, requireAdmin, acquireProductInventory);
router.get('/:productId/recommended', getRecommendedProducts);
router.get('/admin/low-stock', requireAuth, getLowStockProducts);

module.exports = router;

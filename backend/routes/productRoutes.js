const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
	storeProductOffer,
	respondToPriceOffer,
	getRecommendedProducts,
	getLowStockProducts,
	acquireProductInventory,
	updateHandoverDetails,
} = require('../controllers/productController');

const router = express.Router();

router.post('/store/offer', requireAuth, storeProductOffer);
router.patch('/:productId/respond', requireAuth, respondToPriceOffer);
router.patch('/:productId/handover', requireAuth, updateHandoverDetails);
router.patch('/:productId/acquire', requireAuth, requireAdmin, acquireProductInventory);
router.get('/:productId/recommended', getRecommendedProducts);
router.get('/admin/low-stock', requireAuth, getLowStockProducts);

module.exports = router;

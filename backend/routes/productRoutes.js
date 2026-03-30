const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
	prepareListingFeePayment,
	verifyListingFeeAndCreate,
	respondToPriceOffer,
} = require('../controllers/productController');

const router = express.Router();

router.post('/listing-fee/prepare', requireAuth, prepareListingFeePayment);
router.post('/listing-fee/verify-and-create', requireAuth, verifyListingFeeAndCreate);
router.post('/:productId/offer-response', requireAuth, respondToPriceOffer);

module.exports = router;

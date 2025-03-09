const express = require('express');
const { 
  getDiscountCodes, 
  saveDiscountCode, 
  validateDiscountCode 
} = require('../controllers/discountController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getDiscountCodes);
router.post('/save', authMiddleware, saveDiscountCode);
router.get('/validate/:code', authMiddleware, validateDiscountCode);

module.exports = router;

const express = require('express');
const { addToCart, getCart, removeFromCart, clearCart, updateCartQuantity } = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, addToCart);
router.get('/', authMiddleware, getCart);
router.put('/:id', authMiddleware, updateCartQuantity);
router.delete('/:id', authMiddleware, removeFromCart);
router.delete('/', authMiddleware, clearCart);

module.exports = router;
//Importar el framework express.
const express = require('express');
//Importar los controladores de productos.
const { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getUserProducts
} = require('../controllers/productController');
//Importar el middleware de autenticación.
const authMiddleware = require('../middlewares/authMiddleware');

//Crear un enrutador de express.
const router = express.Router();

// Rutas públicas.
router.get('/', getProducts); //Obtener todos los productos
router.get('/categoria/:categoria', getProductsByCategory); //Se filtran los productos por categoría.
router.get('/search', searchProducts); //Se busca un producto por el nombre.
router.get('/:id', getProductById); //Obtener un producto por ID.

// Rutas protegidas (requieren autenticación).
router.get('/user/products', authMiddleware, getUserProducts); //Obtener los productos del usuario autenticado.
router.post('/', authMiddleware, createProduct); //Crear un producto.
router.put('/:id', authMiddleware, updateProduct); //Actualizar un producto existente.
router.delete('/:id', authMiddleware, deleteProduct); //Eliminar un producto.

module.exports = router;
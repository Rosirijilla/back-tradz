const db = require('../config/db');

const addToCart = async (req, res) => {
  console.log('==========================================');
  console.log('PETICIÓN RECIBIDA EN ADD TO CART');
  console.log('Body:', req.body);

  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity || !userId) {
      return res.status(400).json({ 
        error: 'Datos incompletos',
        received: { productId, quantity, userId }
      });
    }

    // Verificar que el producto existe y obtener su precio
    const productCheck = await db.query(
      'SELECT * FROM productos WHERE id_producto = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const precio_unitario = parseFloat(productCheck.rows[0].precio);

    // Verificar si el producto ya está en el carrito
    const cartCheck = await db.query(
      'SELECT * FROM carrito_productos WHERE id_usuario = $1 AND id_producto = $2',
      [userId, productId]
    );

    let result;
    if (cartCheck.rows.length > 0) {
      // Actualizar cantidad y el total se calculará automáticamente
      result = await db.query(
        'UPDATE carrito_productos SET cantidad = cantidad + $1 WHERE id_usuario = $2 AND id_producto = $3 RETURNING *',
        [quantity, userId, productId]
      );
    } else {
      // Insertar nuevo registro (el total se calcula automáticamente por la columna GENERATED)
      result = await db.query(
        `INSERT INTO carrito_productos 
         (id_usuario, id_producto, cantidad, precio_unitario) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, productId, quantity, precio_unitario]
      );
    }

    console.log('Operación exitosa:', result.rows[0]);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('==== ERROR EN ADD TO CART ====');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Detalle:', error.detail);
    
    res.status(500).json({ 
      error: 'Error adding to cart',
      details: error.message
    });
  }
};

const getCart = async (req, res) => {
  console.log('==== INICIO GET CART ====');
  console.log('Usuario solicitando carrito:', req.user);
  
  const userId = req.user.userId;

  try {
    console.log('Ejecutando consulta para userId:', userId);
    const result = await db.query(
      `SELECT 
        cp.*,
        p.nombre_producto,
        p.descripcion,
        p.imagenes,
        p.precio as precio_producto
       FROM carrito_productos cp
       JOIN productos p ON cp.id_producto = p.id_producto
       WHERE cp.id_usuario = $1
       ORDER BY cp.id_carrito_producto DESC`,
      [userId]
    );
    
    console.log('Resultado de la consulta del carrito:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error en getCart:', error);
    res.status(500).json({ 
      error: 'Error fetching cart',
      details: error.message 
    });
  }
};

const removeFromCart = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    await db.query('DELETE FROM carrito_productos WHERE id_usuario = $1 AND id_producto = $2', [userId, id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error removing from cart' });
  }
};

const clearCart = async (req, res) => {
  const userId = req.user.userId;

  try {
    await db.query('DELETE FROM carrito_productos WHERE id_usuario = $1', [userId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error clearing cart' });
  }
};

const updateCartQuantity = async (req, res) => {
  console.log('==== INICIO UPDATE CART QUANTITY ====');
  console.log('Parámetros recibidos:', {
    params: req.params,
    body: req.body,
    userId: req.user?.userId
  });

  try {
    const productId = req.params.id;
    const { quantity } = req.body;  // Asegúrate de que en el frontend envías 'quantity' y no 'cantidad'
    const userId = req.user.userId;

    console.log('Datos procesados:', {
      productId,
      quantity,
      userId
    });

    // Verificar datos
    if (!productId || !quantity || !userId) {
      console.log('Datos incompletos:', { productId, quantity, userId });
      return res.status(400).json({ 
        error: 'Datos incompletos',
        received: { productId, quantity, userId }
      });
    }

    // Verificar que el producto existe en el carrito
    console.log('Verificando producto en carrito...');
    const cartCheck = await db.query(
      'SELECT * FROM carrito_productos WHERE id_usuario = $1 AND id_producto = $2',
      [userId, productId]
    );
    console.log('Resultado verificación:', cartCheck.rows);

    if (cartCheck.rows.length === 0) {
      console.log('Producto no encontrado en carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }

    // Actualizar la cantidad
    console.log('Actualizando cantidad...');
    const result = await db.query(
      `UPDATE carrito_productos 
       SET cantidad = $1 
       WHERE id_usuario = $2 AND id_producto = $3 
       RETURNING *`,
      [quantity, userId, productId]
    );

    console.log('Resultado actualización:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('==== ERROR EN UPDATE CART QUANTITY ====');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    console.error('Detalles adicionales:', {
      params: req.params,
      body: req.body,
      userId: req.user?.userId
    });
    
    res.status(500).json({ 
      error: 'Error updating cart quantity',
      details: error.message
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  updateCartQuantity
};
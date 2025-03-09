const db = require('../config/db');

//Objeto que contiene los métodos para el controlador de productos.
const productController = {

  //Obtenemos todos los productos.
  getProducts: async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM productos ORDER BY id_producto'
      );
      res.status(200).json({
        sucess: true, //Indica que la solicitud fue exitosa.
        data: result.rows, //Contiene la lista de productos conseguidos en la base de datos.
        count: result.rowCount //Muestra cuantos productos se consiguieron.
      });
    } catch (error) {
      console.error('Error en getProducts:', error);
      res.status(500).json({
        success: false, //Indica que la solicitud no fue exitosa.
        message: 'Error al conseguir los productos.', 
        error: error.message //Enseña el error que hubo.
      });      
    }
  },

  //Obtenemos un producto por su ID.
  getProductById: async (req, res) => {
    const {id} = req.params;

    try{
      const result = await db.query(
        'SELECT * FROM productos WHERE id_producto = $1',
        [id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          sucess: false, //No exitoso
          message: 'Producto no encontrado.'
        });
      }

      res.status(200).json({
        sucess : true, //Exitoso
        data: result.rows[0] 
      });
    }catch (error) {
      console.error('Error en getProductById:', error);
      res.status(500).json({
        sucess: false, //No exitoso
        message: 'Error al conseguir el producto.',
        error: error.message
      });
    }
  },

  //Creamos un nuevo producto.
  createProduct: async (req, res) => {
    try {
      console.log('Datos recibidos en createProduct:', req.body);
      
      // Obtener datos del body y el ID del usuario del token
      const { nombre_producto, descripcion, precio, stock, categoria, imagenes } = req.body;
      const userId = req.user.userId;

      // Log detallado de los datos
      console.log('Datos procesados:', {
        nombre_producto,
        descripcion,
        precio,
        stock,
        categoria,
        imagenes,
        userId
      });

      // Validar datos requeridos
      if (!nombre_producto || !precio || !stock || !categoria) {
        console.log('Faltan campos requeridos:', { nombre_producto, precio, stock, categoria });
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos',
          received: { nombre_producto, precio, stock, categoria }
        });
      }

      const result = await db.query(
        `INSERT INTO productos 
         (id_usuario, nombre_producto, descripcion, precio, stock, categoria, imagenes, estado) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id_producto, nombre_producto, descripcion, precio, stock, categoria, imagenes, estado`,
        [
          userId,
          nombre_producto,
          descripcion || '',
          precio,
          stock,
          categoria,
          imagenes || [],
          'disponible'
        ]
      );

      console.log('Producto creado:', result.rows[0]);

      res.status(201).json({
        success: true,
        message: 'Producto creado correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error detallado en createProduct:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Error al crear el producto',
        error: error.message
      });
    }
  },

  //Actualizamos un producto que ya existe.
  updateProduct: async (req, res) => {
    const { id } = req.params;
    
    try {
      // Log completo de la petición
      console.log('=== Inicio de updateProduct ===');
      console.log('Params:', { id });
      console.log('Body completo:', req.body);
      console.log('Headers:', req.headers);
      
      // Extraer los datos del body con valores por defecto
      const {
        nombre_producto,
        descripcion = '',
        precio,
        stock,
        categoria,
        imagenes,
        estado = 'disponible'
      } = req.body;

      // Log de los datos extraídos
      console.log('Datos extraídos:', {
        nombre_producto,
        descripcion,
        precio,
        stock,
        categoria,
        imagenes,
        estado
      });

      // Validar que tenemos los datos necesarios
      if (!nombre_producto || !precio || !stock || !categoria) {
        console.log('Faltan campos requeridos:', { nombre_producto, precio, stock, categoria });
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos',
          received: { nombre_producto, precio, stock, categoria }
        });
      }

      // Log de la consulta SQL que vamos a ejecutar
      const query = `
        UPDATE productos 
        SET nombre_producto = $1, 
            descripcion = $2, 
            precio = $3, 
            stock = $4, 
            categoria = $5, 
            imagenes = $6, 
            estado = $7 
        WHERE id_producto = $8 
        RETURNING *`;

      console.log('Query a ejecutar:', query);
      console.log('Valores:', [
        nombre_producto,
        descripcion,
        precio,
        stock,
        categoria,
        imagenes ? [imagenes] : [],
        estado,
        id
      ]);

      const result = await db.query(query, [
        nombre_producto,
        descripcion,
        precio,
        stock,
        categoria,
        imagenes ? [imagenes] : [],
        estado,
        id
      ]);

      if (result.rowCount === 0) {
        console.log('No se encontró el producto con id:', id);
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado.'
        });
      }

      console.log('Producto actualizado exitosamente:', result.rows[0]);

      res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente.',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error detallado en updateProduct:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        body: req.body,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el producto.',
        error: error.message
      });
    }
  },

  //Eliminamos uno de los productos.
  deleteProduct: async (req, res) =>{
    const {id} = req.params;

    try{
      const result = await db.query(
        'DELETE FROM productos WHERE id_producto = $1 RETURNING *',
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          sucess:false,
          message: 'Producto no encontrado.'
        });
      }

      res.status(200).json({
        sucess: true,
        message: 'Producto eliminado correctamente.',
        data: result.rows[0]
      });
    }catch (error) {
      console.error('Error en deleteProduct:', error);
      res.status(500).json({
        sucess: false,
        message: 'Error al eliminar el producto.',
        error: error.message
      });
    }
  },

  //Obtenemos los productos según la cetegoría
  getProductsByCategory: async (req, res) => {
    const {categoria} = req.params;

    try{
      const result = await db.query(
        'SELECT * FROM productos WHERE categoria = $1',
        [categoria]
      );
    }catch (error) {
      console.error('Error en getProductsByCategory:', error);
      res.status(500).json({
        sucess: false,
        message: 'Error al obtener los productos por categoría.',
        error: error.message
      });
    }
  },

  //Buscamos los productos por el nombre.
  searchProducts: async (req, res) => {
    const {q} = req.query; //Q vendría a ser el término para buscar el producto.

    try {
      console.log('Buscando productos con término:', q);

      const result = await db.query(
        `SELECT 
          id_producto,
          nombre_producto,
          descripcion,
          precio,
          stock,
          categoria,
          imagenes,
          estado
         FROM productos 
         WHERE nombre_producto ILIKE $1 OR descripcion ILIKE $1
         ORDER BY nombre_producto`,
        [`%${q}%`]
      );

      console.log(`Se encontraron ${result.rowCount} productos`);

      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error en searchProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar los productos.',
        error: error.message
      });
    }
  },

  //Obtenemos los productos del usuario autenticado.
  getUserProducts: async (req, res) => {
    try {
      const userId = req.user.userId; // Obtenemos el ID del usuario del token.
      
      const result = await db.query(
        `SELECT 
          id_producto, 
          nombre_producto, 
          descripcion, 
          precio, 
          stock, 
          categoria, 
          imagenes[1] as imagen, 
          estado
         FROM productos 
         WHERE id_usuario = $1 
         ORDER BY id_producto`,
        [userId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error en getUserProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos del usuario.',
        error: error.message
      });
    }
  }
};

module.exports = productController; 
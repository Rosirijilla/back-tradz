const db = require('../config/db');

// Validar un código de descuento
const validateDiscountCode = async (req, res) => {
  const { code } = req.params;
  console.log('Intentando validar código:', code);

  try {
    console.log('Ejecutando consulta para validar código...');
    // Verificar si el código existe, está activo, no ha expirado y no ha superado el uso máximo
    const result = await db.query(
      `SELECT * FROM codigos_descuento 
       WHERE codigo = $1 
       AND estado = 'activo' 
       AND fecha_expiracion >= CURRENT_DATE
       AND (uso_actual < uso_maximo OR uso_maximo = 0)`,
      [code]
    );

    console.log('Resultado de la consulta:', result.rows);

    if (result.rows.length === 0) {
      // Buscar el código sin condiciones para saber por qué falló
      const codigoExistente = await db.query('SELECT * FROM codigos_descuento WHERE codigo = $1', [code]);
      console.log('Búsqueda simple del código:', codigoExistente.rows);

      if (codigoExistente.rows.length > 0) {
        const codigo = codigoExistente.rows[0];
        let razon = '';
        if (codigo.estado !== 'activo') razon = 'código inactivo';
        else if (codigo.fecha_expiracion < new Date()) razon = 'código expirado';
        else if (codigo.uso_actual >= codigo.uso_maximo) razon = 'uso máximo alcanzado';
        
        console.log('Código encontrado pero no válido. Razón:', razon);
      } else {
        console.log('Código no encontrado en la base de datos');
      }

      return res.status(404).json({ 
        success: false, 
        message: 'Código de descuento no válido o ha expirado' 
      });
    }

    const discount = result.rows[0];
    console.log('Código válido encontrado:', discount);

    // Incrementar el contador de usos
    await db.query(
      `UPDATE codigos_descuento 
       SET uso_actual = uso_actual + 1 
       WHERE codigo = $1`,
      [code]
    );

    // Verificar si alcanzó el uso máximo después de incrementar
    if (discount.uso_actual + 1 >= discount.uso_maximo) {
      await db.query(
        `UPDATE codigos_descuento 
         SET estado = 'inactivo' 
         WHERE codigo = $1`,
        [code]
      );
    }

    res.json({ 
      success: true, 
      discount: {
        ...discount,
        uso_actual: discount.uso_actual + 1
      }
    });
  } catch (error) {
    console.error('Error al validar el código de descuento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Guardar un código de descuento
const saveDiscountCode = async (req, res) => {
  const { codigo, descuento, tipo_descuento, uso_maximo = 100 } = req.body;
  const userId = req.userId;

  console.log('Datos recibidos para guardar el código de descuento:', {
    userId,
    codigo,
    descuento,
    tipo_descuento,
    uso_maximo
  });

  try {
    // Validaciones
    if (!codigo || !descuento || !tipo_descuento) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos',
        received: { codigo, descuento, tipo_descuento }
      });
    }

    // Validar el formato del descuento según el tipo
    if (tipo_descuento === '%' && (descuento <= 0 || descuento > 100)) {
      return res.status(400).json({
        success: false,
        message: 'El descuento en porcentaje debe estar entre 1 y 100'
      });
    }

    if (tipo_descuento === 'CLP' && descuento <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El descuento en CLP debe ser mayor a 0'
      });
    }

    // Verificar si el código ya existe
    const existingCode = await db.query(
      'SELECT * FROM codigos_descuento WHERE codigo = $1',
      [codigo]
    );
    
    if (existingCode.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El código de descuento ya existe' 
      });
    }

    // Configurar valores por defecto
    const uso_actual = 0;
    const estado = 'activo';
    const fecha_expiracion = new Date();
    fecha_expiracion.setMonth(fecha_expiracion.getMonth() + 1);

    const result = await db.query(
      `INSERT INTO codigos_descuento (
        usuario_id, codigo, descuento, tipo_descuento, 
        uso_actual, uso_maximo, estado, fecha_expiracion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        userId, 
        codigo, 
        descuento, 
        tipo_descuento,
        uso_actual,
        uso_maximo,
        estado,
        fecha_expiracion
      ]
    );

    console.log('Código de descuento guardado:', result.rows[0]);
    res.status(201).json({ 
      success: true, 
      discount: result.rows[0],
      message: 'Código de descuento creado exitosamente' 
    });
  } catch (error) {
    console.error('Error al guardar el código de descuento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al guardar el código de descuento',
      error: error.message
    });
  }
};

// Obtener todos los códigos de descuento
const getDiscountCodes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM codigos_descuento 
       ORDER BY 
         CASE WHEN estado = 'activo' THEN 0 ELSE 1 END,
         fecha_expiracion DESC`
    );
    
    res.json({ 
      success: true, 
      discounts: result.rows 
    });
  } catch (error) {
    console.error('Error al obtener los códigos de descuento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

module.exports = {
  validateDiscountCode,
  saveDiscountCode,
  getDiscountCodes,
};

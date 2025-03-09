// Importaciones.
const bcrypt = require('bcrypt'); // Para encriptar la contraseña.
const jwt = require('jsonwebtoken'); //Para crear tokens de autenticación.
require('dotenv').config();
const db = require('../config/db'); // Para interacturar con la base de datos.

//Registro del usuario.
const register = async (req, res) => {
  const { email, password, nombre, telefono, direccion, tipo_usuario } = req.body;

  // Validaciones de los campos.
  if (!email || !password || !nombre || !telefono || !direccion || !tipo_usuario) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  //Validamos el correo con regex.
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'El correo no es válido' });
  //Validamos que la contraseña tenga al menos 6 caracteres.
  } else if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  //Encriptamos la contraseña.
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, hashed_password, telefono, direccion, tipo_usuario, fecha_registro, estado) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *',
      [nombre, email, hashedPassword, telefono, direccion, tipo_usuario, 'activo']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
};

const generateTokens = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está definida en las variables de entorno');
  }

  const accessToken = jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Intento de login:', { email }); // No logear la contraseña

  try {
    console.log('Buscando usuario en la base de datos...');
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    console.log('Usuario encontrado:', result.rows.length > 0);

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.hashed_password))) {
      console.log('Credenciales inválidas');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Generando tokens...');
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    console.log('Guardando refresh token...');
    await db.query(
      'UPDATE usuarios SET refresh_token = $1, refresh_token_expires_at = NOW() + INTERVAL \'7 days\' WHERE id = $2',
      [refreshToken, user.id]
    );

    console.log('Login exitoso');
    res.json({ 
      accessToken, 
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre
      }
    });
  } catch (error) {
    console.error('Error detallado en login:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

const getProfile = async (req, res) => {
  try {
    console.log('Token decodificado:', req.user);
    
    // Modificamos la consulta para seleccionar solo los campos necesarios
    const result = await db.query(
      `SELECT 
        id, 
        nombre, 
        email, 
        telefono, 
        direccion, 
        tipo_usuario, 
        imagen_url,
        fecha_registro, 
        estado
      FROM usuarios 
      WHERE id = $1`,
      [req.user.userId]
    );
    
    console.log('Resultado de la consulta:', result.rows);
    
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombre, email, telefono, imagen_url, direccion } = req.body;

    console.log('Datos recibidos en updateProfile:', {
      userId,
      nombre,
      email,
      telefono,
      imagen_url,
      direccion
    });

    // Validaciones
    if (!nombre || !email || !telefono || !direccion || ! imagen_url) {
      console.log('Faltan campos requeridos');
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('Email inválido:', email);
      return res.status(400).json({ error: 'El correo no es válido' });
    }

    // Verificar si el email ya existe
    console.log('Verificando duplicidad de email...');
    const emailCheck = await db.query(
      'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
      [email, userId]
    );
    console.log('Resultado verificación email:', emailCheck.rows);

    if (emailCheck.rows.length > 0) {
      console.log('Email duplicado encontrado');
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    // Actualizar el perfil
    console.log('Intentando actualizar usuario...');
    const result = await db.query(
      `UPDATE usuarios 
       SET nombre = $1, 
           email = $2, 
           telefono = $3, 
           direccion = $4,
           imagen_url = $5,
           fecha_actualizacion = NOW()
       WHERE id = $6 
       RETURNING id, nombre, email, telefono, imagen_url, direccion, tipo_usuario, estado`,
      [nombre, email, telefono, direccion, imagen_url, userId]
    );

    console.log('Resultado de la actualización:', result.rows);

    if (result.rows.length === 0) {
      console.log('Usuario no encontrado para ID:', userId);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error detallado al actualizar perfil:', {
      message: error.message,
      stack: error.stack,
      query: error.query,
      parameters: error.parameters
    });
    res.status(500).json({ 
      error: 'Error al actualizar el perfil',
      details: error.message 
    });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Verificar si el refresh token es válido y no ha expirado
    const result = await db.query(
      'SELECT * FROM usuarios WHERE refresh_token = $1 AND refresh_token_expires_at > NOW()',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = result.rows[0];
    
    // Generar nuevo access token
    const accessToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error('Error en refresh token:', error);
    res.status(500).json({ error: 'Error refreshing token' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken
};
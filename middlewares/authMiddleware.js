const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  console.log('AuthMiddleware - Headers recibidos:', req.headers);
  const authHeader = req.header('Authorization');
  console.log('AuthMiddleware - Authorization header:', authHeader);

  if (!authHeader) {
    console.log('AuthMiddleware - No se encontró token');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('AuthMiddleware - Formato de token inválido');
    return res.status(400).json({ error: 'Invalid token format. Must start with "Bearer "' });
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('AuthMiddleware - Token extraído:', token.substring(0, 20) + '...');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('AuthMiddleware - Token decodificado:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('AuthMiddleware - Error al verificar token:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;

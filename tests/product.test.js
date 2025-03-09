const request = require('supertest');
const app = require('../app'); // Asegúrate de exportar la app en tu archivo principal
const db = require('../config/db');

// Token de prueba para simular un usuario autenticado
let authToken;

// Datos de prueba
const testUser = {
  email: 'test@test.com',
  password: 'password123'
};

const testProduct = {
  nombre: 'Producto de prueba',
  descripcion: 'Descripción de prueba',
  precio: 100,
  stock: 10,
  categoria: 'Electrónica',
  imagenes: 'https://ejemplo.com/imagen.jpg'
};

// Antes de todas las pruebas
beforeAll(async () => {
  // Login para obtener el token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send(testUser);
  
  authToken = loginResponse.body.token;
});

// Después de todas las pruebas
afterAll(async () => {
  await db.end(); // Cerrar la conexión a la base de datos
});

describe('Product API Tests', () => {
  // Test 1: Crear un producto
  describe('POST /api/productos', () => {
    it('should create a new product', async () => {
      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id_producto');
      expect(response.body.data.nombre_producto).toBe(testProduct.nombre);
    });
  });

  // Test 2: Obtener productos del usuario
  describe('GET /api/productos/user/products', () => {
    it('should get all products for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/productos/user/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Test 3: Actualizar un producto
  describe('PUT /api/productos/:id', () => {
    it('should update an existing product', async () => {
      // Primero crear un producto
      const createResponse = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);

      const productId = createResponse.body.data.id_producto;

      // Luego actualizarlo
      const updateResponse = await request(app)
        .put(`/api/productos/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testProduct,
          nombre: 'Producto actualizado',
          precio: 200
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.nombre_producto).toBe('Producto actualizado');
      expect(updateResponse.body.data.precio).toBe(200);
    });
  });

  // Test 4: Eliminar un producto
  describe('DELETE /api/productos/:id', () => {
    it('should delete an existing product', async () => {
      // Primero crear un producto
      const createResponse = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);

      const productId = createResponse.body.data.id_producto;

      // Luego eliminarlo
      const deleteResponse = await request(app)
        .delete(`/api/productos/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verificar que el producto ya no existe
      const getResponse = await request(app)
        .get(`/api/productos/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
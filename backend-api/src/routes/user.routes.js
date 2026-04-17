// =============================================
// ARCHIVO: backend-api/src/routes/user.routes.js
// Rutas de Usuarios (CRUD)
// =============================================
const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios del sistema
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

// GET /api/users - Listar usuarios
router.get('/', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
                   r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - full_name
 *             properties:
 *               username:
 *                 type: string
 *                 example: nuevousuario
 *               email:
 *                 type: string
 *                 example: nuevo@vigiliacc.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               full_name:
 *                 type: string
 *                 example: Nuevo Usuario
 *               role_id:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Usuario creado
 *       409:
 *         description: Usuario ya existe
 */

// POST /api/users - Crear usuario
router.post('/', authenticateToken, requireRole('SuperAdmin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role_id } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, full_name, role_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, full_name, role_id, created_at`,
            [username, email, hashedPassword, full_name, role_id || 5]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               role_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, role_id, is_active } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name), 
                 email = COALESCE($2, email),
                 role_id = COALESCE($3, role_id),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING id, username, email, full_name, role_id, is_active`,
            [full_name, email, role_id, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Desactivar usuario (soft delete)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario desactivado
 *       404:
 *         description: Usuario no encontrado
 */

// DELETE /api/users/:id - Eliminar usuario (soft delete)
router.delete('/:id', authenticateToken, requireRole('SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
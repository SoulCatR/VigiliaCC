// =============================================
// ARCHIVO: backend-api/src/controllers/userController.js
// Controlador de Usuarios
// =============================================
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const getAllUsers = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.email, u.full_name, u.is_active, 
                   u.last_login, u.created_at, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
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

        // Registrar en audit_logs
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_USER', 'users', result.rows[0].id, JSON.stringify({ username })]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        next(error);
    }
};

const updateUser = async (req, res, next) => {
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

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'UPDATE_USER', 'users', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'DEACTIVATE_USER', 'users', id]
        );

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
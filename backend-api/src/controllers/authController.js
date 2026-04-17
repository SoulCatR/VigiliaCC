// =============================================
// ARCHIVO: backend-api/src/controllers/authController.js
// Controlador de Autenticación
// =============================================
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../config/jwt');

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query(
            `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, 
                    r.name as role_name
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: 'User account is inactive' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({ userId: user.id, username: user.username });

        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
            [user.id, 'LOGIN', JSON.stringify({ ip: req.ip })]
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role_name
            }
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        if (req.user) {
            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
                [req.user.id, 'LOGOUT', JSON.stringify({ ip: req.ip })]
            );
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, logout };
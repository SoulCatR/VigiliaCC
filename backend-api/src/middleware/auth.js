// =============================================
// ARCHIVO: middleware/auth.js
// Autenticación JWT + Roles
// =============================================
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar si el usuario existe y está activo
        const userResult = await pool.query(
            'SELECT id, username, email, role_id, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(403).json({ error: 'User not found or inactive' });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const roleResult = await pool.query(
                'SELECT name FROM roles WHERE id = $1',
                [req.user.role_id]
            );

            if (roleResult.rows.length === 0) {
                return res.status(403).json({ error: 'Role not found' });
            }

            const userRole = roleResult.rows[0].name;

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: allowedRoles,
                    current: userRole
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({ error: 'Error checking permissions' });
        }
    };
};

module.exports = { authenticateToken, requireRole };

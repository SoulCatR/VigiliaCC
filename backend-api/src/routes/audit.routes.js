// =============================================
// ARCHIVO: backend-api/src/routes/audit.routes.js
// Rutas de Auditoría
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Logs de auditoría del sistema
 */

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Listar logs de auditoría
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filtrar por usuario
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por acción (LOGIN, LOGOUT, etc)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de logs
 */

// GET /api/audit/logs - Listar logs de auditoría
router.get('/logs', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { user_id, action, date_from, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT al.*, u.username
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (user_id) {
            query += ` AND al.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }

        if (action) {
            query += ` AND al.action ILIKE $${paramCount}`;
            params.push(`%${action}%`);
            paramCount++;
        }

        if (date_from) {
            query += ` AND al.created_at >= $${paramCount}`;
            params.push(date_from);
            paramCount++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ logs: result.rows });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
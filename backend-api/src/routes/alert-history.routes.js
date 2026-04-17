// =============================================
// ARCHIVO: backend-api/src/routes/alert-history.routes.js
// Rutas de Historial de Alertas
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * /alert-history/{alert_id}:
 *   get:
 *     summary: Obtener historial de cambios de una alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alert_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial de la alerta
 */
router.get('/:alert_id', authenticateToken, async (req, res) => {
    try {
        const { alert_id } = req.params;
        
        const result = await pool.query(`
            SELECT ah.*, u.username as changed_by_username
            FROM alert_history ah
            LEFT JOIN users u ON ah.changed_by = u.id
            WHERE ah.alert_id = $1
            ORDER BY ah.changed_at DESC
        `, [alert_id]);
        
        res.json({ history: result.rows });
    } catch (error) {
        console.error('Error fetching alert history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
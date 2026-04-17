// =============================================
// ARCHIVO: backend-api/src/routes/alert.routes.js
// Rutas de Alertas (CORE DEL SISTEMA)
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Gestión de alertas del sistema de vigilancia
 */

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Listar alertas con filtros y paginación
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, discarded]
 *         description: Filtrar por estado
 *       - in: query
 *         name: camera_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de cámara
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       200:
 *         description: Lista de alertas con paginación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
// GET /api/alerts - Listar alertas con filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, camera_id, date_from, date_to, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT a.*, c.name as camera_name, z.name as zone_name,
                   ac.name as category_name, ac.severity,
                   u.username as confirmed_by_username
            FROM alerts a
            LEFT JOIN cameras c ON a.camera_id = c.id
            LEFT JOIN zones z ON c.zone_id = z.id
            LEFT JOIN alert_categories ac ON a.category_id = ac.id
            LEFT JOIN users u ON a.confirmed_by = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND a.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (camera_id) {
            query += ` AND a.camera_id = $${paramCount}`;
            params.push(camera_id);
            paramCount++;
        }

        if (date_from) {
            query += ` AND a.detected_at >= $${paramCount}`;
            params.push(date_from);
            paramCount++;
        }

        if (date_to) {
            query += ` AND a.detected_at <= $${paramCount}`;
            params.push(date_to);
            paramCount++;
        }

        query += ` ORDER BY a.detected_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación
        const countResult = await pool.query('SELECT COUNT(*) FROM alerts');
        
        res.json({
            alerts: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Crear nueva alerta (usado por el sistema IA)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - camera_id
 *               - confidence
 *             properties:
 *               camera_id:
 *                 type: integer
 *                 description: ID de la cámara que detectó
 *               category_id:
 *                 type: integer
 *                 description: ID de la categoría de alerta
 *               confidence:
 *                 type: number
 *                 format: float
 *                 description: Nivel de confianza (0-1)
 *               image_path:
 *                 type: string
 *                 description: Ruta de la imagen capturada
 *               video_clip_path:
 *                 type: string
 *                 description: Ruta del clip de video
 *     responses:
 *       201:
 *         description: Alerta creada exitosamente
 *       400:
 *         description: Datos inválidos
 */
// POST /api/alerts - Crear nueva alerta (usado por el modelo IA)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { camera_id, category_id, confidence, image_path, video_clip_path } = req.body;

        if (!camera_id || confidence === undefined) {
            return res.status(400).json({ error: 'camera_id and confidence are required' });
        }

        const result = await pool.query(
            `INSERT INTO alerts (camera_id, category_id, confidence, image_path, video_clip_path, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [camera_id, category_id || null, confidence, image_path || null, video_clip_path || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

/**
 * @swagger
 * /alerts/{id}/confirm:
 *   patch:
 *     summary: Confirmar una alerta como válida
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la alerta
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notas adicionales sobre la confirmación
 *     responses:
 *       200:
 *         description: Alerta confirmada exitosamente
 *       404:
 *         description: Alerta no encontrada
 */
// PATCH /api/alerts/:id/confirm - Confirmar alerta
router.patch('/:id/confirm', authenticateToken, requireRole('Operator', 'Supervisor', 'Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Actualizar alerta
            const alertResult = await client.query(
                `UPDATE alerts 
                 SET status = 'confirmed', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP, notes = $2
                 WHERE id = $3
                 RETURNING *`,
                [req.user.userId, notes || null, id]
            );

            if (alertResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Alert not found' });
            }

            // Registrar en historial (si existe la tabla)
            try {
                await client.query(
                    `INSERT INTO alert_history (alert_id, previous_status, new_status, changed_by, change_reason)
                     VALUES ($1, 'pending', 'confirmed', $2, $3)`,
                    [id, req.user.userId, notes || 'Alert confirmed']
                );
            } catch (historyError) {
                console.log('Alert history table not found, skipping...');
            }

            // Registrar en audit_logs (si existe la tabla)
            try {
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
                     VALUES ($1, 'CONFIRM_ALERT', 'alerts', $2, $3)`,
                    [req.user.userId, id, JSON.stringify({ notes })]
                );
            } catch (auditError) {
                console.log('Audit logs table not found, skipping...');
            }

            await client.query('COMMIT');
            res.json(alertResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error confirming alert:', error);
        res.status(500).json({ error: 'Failed to confirm alert' });
    }
});

/**
 * @swagger
 * /alerts/{id}/discard:
 *   patch:
 *     summary: Descartar una alerta como falso positivo
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la alerta
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón del descarte
 *     responses:
 *       200:
 *         description: Alerta descartada exitosamente
 *       404:
 *         description: Alerta no encontrada
 */
// PATCH /api/alerts/:id/discard - Descartar alerta
router.patch('/:id/discard', authenticateToken, requireRole('Operator', 'Supervisor', 'Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const alertResult = await client.query(
                `UPDATE alerts 
                 SET status = 'discarded', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP, notes = $2
                 WHERE id = $3
                 RETURNING *`,
                [req.user.userId, reason || 'False positive', id]
            );

            if (alertResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Alert not found' });
            }

            // Registrar en historial (si existe la tabla)
            try {
                await client.query(
                    `INSERT INTO alert_history (alert_id, previous_status, new_status, changed_by, change_reason)
                     VALUES ($1, 'pending', 'discarded', $2, $3)`,
                    [id, req.user.userId, reason || 'False positive']
                );
            } catch (historyError) {
                console.log('Alert history table not found, skipping...');
            }

            await client.query('COMMIT');
            res.json(alertResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error discarding alert:', error);
        res.status(500).json({ error: 'Failed to discard alert' });
    }
});

module.exports = router;
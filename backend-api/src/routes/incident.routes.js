// =============================================
// ARCHIVO: backend-api/src/routes/incident.routes.js
// Rutas de Incidentes
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Gestión de incidentes de seguridad
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Incident:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         alert_id:
 *           type: integer
 *         incident_type:
 *           type: string
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description:
 *           type: string
 *         resolved:
 *           type: boolean
 *         reported_by:
 *           type: integer
 *         reported_at:
 *           type: string
 *           format: date-time
 *         resolved_by:
 *           type: integer
 *         resolved_at:
 *           type: string
 *           format: date-time
 *         resolution_notes:
 *           type: string
 *         assigned_to:
 *           type: integer
 */

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: Listar incidentes
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado resuelto
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de incidentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 incidents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incident'
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { resolved, date_from, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT i.*, a.id as alert_id, a.confidence,
                   c.name as camera_name, z.name as zone_name,
                   u1.username as reported_by_username,
                   u2.username as resolved_by_username,
                   u3.username as assigned_to_username
            FROM incidents i
            LEFT JOIN alerts a ON i.alert_id = a.id
            LEFT JOIN cameras c ON a.camera_id = c.id
            LEFT JOIN zones z ON c.zone_id = z.id
            LEFT JOIN users u1 ON i.reported_by = u1.id
            LEFT JOIN users u2 ON i.resolved_by = u2.id
            LEFT JOIN users u3 ON i.assigned_to = u3.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (resolved !== undefined) {
            query += ` AND i.resolved = $${paramCount}`;
            params.push(resolved === 'true');
            paramCount++;
        }

        if (date_from) {
            query += ` AND i.reported_at >= $${paramCount}`;
            params.push(date_from);
            paramCount++;
        }

        query += ` ORDER BY i.reported_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ incidents: result.rows });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

/**
 * @swagger
 * /incidents:
 *   post:
 *     summary: Crear nuevo incidente
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incident_type
 *             properties:
 *               alert_id:
 *                 type: integer
 *                 example: 1
 *               incident_type:
 *                 type: string
 *                 example: theft
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 example: high
 *               description:
 *                 type: string
 *                 example: Intento de robo detectado
 *     responses:
 *       201:
 *         description: Incidente creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 */
router.post('/', authenticateToken, requireRole('Operator', 'Supervisor', 'Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { alert_id, incident_type, severity, description } = req.body;

        if (!incident_type) {
            return res.status(400).json({ error: 'incident_type is required' });
        }

        const result = await pool.query(
            `INSERT INTO incidents (alert_id, incident_type, severity, description, reported_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [alert_id || null, incident_type, severity || 'medium', description || null, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

/**
 * @swagger
 * /incidents/{id}/resolve:
 *   patch:
 *     summary: Resolver incidente
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del incidente
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution_notes:
 *                 type: string
 *                 example: Incidente resuelto, persona identificada
 *     responses:
 *       200:
 *         description: Incidente resuelto exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       404:
 *         description: Incidente no encontrado
 */
router.patch('/:id/resolve', authenticateToken, requireRole('Supervisor', 'Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;

        const result = await pool.query(
            `UPDATE incidents 
             SET resolved = TRUE, 
                 resolved_by = $1, 
                 resolved_at = CURRENT_TIMESTAMP,
                 resolution_notes = $2
             WHERE id = $3
             RETURNING *`,
            [req.user.id, resolution_notes || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error resolving incident:', error);
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});

/**
 * @swagger
 * /incidents/{id}/assign:
 *   patch:
 *     summary: Asignar incidente a un usuario
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del incidente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigned_to
 *             properties:
 *               assigned_to:
 *                 type: integer
 *                 example: 5
 *                 description: ID del usuario al que se asigna el incidente
 *     responses:
 *       200:
 *         description: Incidente asignado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       404:
 *         description: Incidente no encontrado
 *       400:
 *         description: assigned_to es requerido
 */
router.patch('/:id/assign', authenticateToken, requireRole('Supervisor', 'Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to } = req.body;

        if (!assigned_to) {
            return res.status(400).json({ error: 'assigned_to is required' });
        }

        const result = await pool.query(
            `UPDATE incidents 
             SET assigned_to = $1
             WHERE id = $2
             RETURNING *`,
            [assigned_to, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error assigning incident:', error);
        res.status(500).json({ error: 'Failed to assign incident' });
    }
});

module.exports = router;
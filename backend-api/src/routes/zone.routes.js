// =============================================
// ARCHIVO: backend-api/src/routes/zone.routes.js
// Rutas de Zonas
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Zones
 *   description: Gestión de zonas de vigilancia
 */

/**
 * @swagger
 * /zones:
 *   get:
 *     summary: Listar todas las zonas
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de zonas con conteo de cámaras
 */

// GET /api/zones - Listar zonas
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT z.*, 
                   COUNT(c.id) as camera_count
            FROM zones z
            LEFT JOIN cameras c ON z.id = c.zone_id
            GROUP BY z.id
            ORDER BY z.floor, z.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
});

/**
 * @swagger
 * /zones:
 *   post:
 *     summary: Crear nueva zona
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Área de Carga
 *               description:
 *                 type: string
 *                 example: Zona de carga y descarga
 *               floor:
 *                 type: integer
 *                 example: 1
 *               is_critical:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Zona creada
 */

// POST /api/zones - Crear zona
router.post('/', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { name, description, floor, is_critical } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }

        const result = await pool.query(
            `INSERT INTO zones (name, description, floor, is_critical)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name, description || null, floor || 1, is_critical || false]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({ error: 'Failed to create zone' });
    }
});

/**
 * @swagger
 * /zones/{id}:
 *   put:
 *     summary: Actualizar zona
 *     tags: [Zones]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               floor:
 *                 type: integer
 *               is_critical:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Zona actualizada
 *       404:
 *         description: Zona no encontrada
 */

// PUT /api/zones/:id - Actualizar zona
router.put('/:id', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, floor, is_critical } = req.body;

        const result = await pool.query(
            `UPDATE zones 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 floor = COALESCE($3, floor),
                 is_critical = COALESCE($4, is_critical),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [name, description, floor, is_critical, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({ error: 'Failed to update zone' });
    }
});

module.exports = router;
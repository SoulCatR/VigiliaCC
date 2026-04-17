// =============================================
// ARCHIVO: backend-api/src/routes/camera.routes.js
// Rutas para gestión de cámaras
// =============================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /cameras:
 *   get:
 *     summary: Obtener todas las cámaras
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cámaras
 */
// GET /api/cameras - Listar todas las cámaras con información de zona
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, z.name as zone_name, z.floor
             FROM cameras c
             LEFT JOIN zones z ON c.zone_id = z.id
             ORDER BY c.id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching cameras:', error);
        res.status(500).json({ error: 'Failed to fetch cameras' });
    }
});

/**
 * @swagger
 * /cameras/{id}:
 *   get:
 *     summary: Obtener una cámara específica
 *     tags: [Cameras]
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
 *         description: Datos de la cámara
 *       404:
 *         description: Cámara no encontrada
 */
// GET /api/cameras/:id - Obtener cámara específica
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT c.*, z.name as zone_name, z.floor
             FROM cameras c
             LEFT JOIN zones z ON c.zone_id = z.id
             WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching camera:', error);
        res.status(500).json({ error: 'Failed to fetch camera' });
    }
});

/**
 * @swagger
 * /cameras:
 *   post:
 *     summary: Crear nueva cámara
 *     tags: [Cameras]
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
 *               - ip_address
 *             properties:
 *               name:
 *                 type: string
 *               ip_address:
 *                 type: string
 *               rtsp_url:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               model:
 *                 type: string
 *               resolution:
 *                 type: string
 *               fps:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Cámara creada
 */
// POST /api/cameras - Crear nueva cámara
router.post('/', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { name, ip_address, rtsp_url, zone_id, model, resolution, fps } = req.body;

        if (!name || !ip_address) {
            return res.status(400).json({ error: 'Name and IP address are required' });
        }

        const result = await pool.query(
            `INSERT INTO cameras (name, ip_address, rtsp_url, zone_id, model, resolution, fps, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
             RETURNING *`,
            [name, ip_address, rtsp_url, zone_id, model, resolution, fps]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating camera:', error);
        
        // Error de IP duplicada
        if (error.code === '23505') {
            return res.status(409).json({ error: 'IP address already exists' });
        }
        
        res.status(500).json({ error: 'Failed to create camera' });
    }
});

/**
 * @swagger
 * /cameras/{id}:
 *   patch:
 *     summary: Actualizar datos de cámara
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ip_address:
 *                 type: string
 *               rtsp_url:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               model:
 *                 type: string
 *               resolution:
 *                 type: string
 *               fps:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cámara actualizada
 *       404:
 *         description: Cámara no encontrada
 */
// PATCH /api/cameras/:id - Actualizar cámara completa
router.patch('/:id', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ip_address, rtsp_url, zone_id, model, resolution, fps } = req.body;

        const result = await pool.query(
            `UPDATE cameras 
             SET name = COALESCE($1, name),
                 ip_address = COALESCE($2, ip_address),
                 rtsp_url = COALESCE($3, rtsp_url),
                 zone_id = COALESCE($4, zone_id),
                 model = COALESCE($5, model),
                 resolution = COALESCE($6, resolution),
                 fps = COALESCE($7, fps),
                 updated_at = CURRENT_TIMESTAMP,
                 last_ping = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [name, ip_address, rtsp_url, zone_id, model, resolution, fps, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating camera:', error);
        res.status(500).json({ error: 'Failed to update camera' });
    }
});

/**
 * @swagger
 * /cameras/{id}/status:
 *   patch:
 *     summary: Actualizar estado de cámara
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
// PATCH /api/cameras/:id/status - Actualizar solo estado
router.patch('/:id/status', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log('📝 Actualizando estado:', { id, status }); // ← AGREGAR ESTE LOG

        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const result = await pool.query(
            `UPDATE cameras 
             SET status = $1, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        console.log('✅ Resultado:', result.rows[0]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error updating camera status:', error);
        res.status(500).json({ error: 'Failed to update camera status' });
    }
});

/**
 * @swagger
 * /cameras/{id}:
 *   delete:
 *     summary: Eliminar cámara
 *     tags: [Cameras]
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
 *         description: Cámara eliminada
 *       404:
 *         description: Cámara no encontrada
 */
// DELETE /api/cameras/:id - Eliminar cámara
router.delete('/:id', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM cameras WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        res.json({ message: 'Camera deleted successfully', camera: result.rows[0] });
    } catch (error) {
        console.error('Error deleting camera:', error);
        res.status(500).json({ error: 'Failed to delete camera' });
    }
});

module.exports = router;
// =============================================
// ARCHIVO: backend-api/src/routes/settings.routes.js
// Rutas de Configuración del Sistema
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Configuración del sistema
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Obtener todas las configuraciones
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de configuraciones
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM system_settings ORDER BY key'
        );
        
        // Convertir a objeto key-value
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = {
                value: row.value,
                description: row.description,
                updated_at: row.updated_at,
            };
        });
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * @swagger
 * /settings/{key}:
 *   get:
 *     summary: Obtener una configuración específica
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuración encontrada
 *       404:
 *         description: Configuración no encontrada
 */
router.get('/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM system_settings WHERE key = $1',
            [key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

/**
 * @swagger
 * /settings/{key}:
 *   put:
 *     summary: Actualizar una configuración
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
router.put('/:key', authenticateToken, requireRole('Admin', 'SuperAdmin'), async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }
        
        const result = await pool.query(
            `UPDATE system_settings 
             SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE key = $3
             RETURNING *`,
            [value, req.user.userId, key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        console.log(`⚙️ Setting updated: ${key} = ${value}`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: Crear nueva configuración
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Configuración creada
 */
router.post('/', authenticateToken, requireRole('SuperAdmin'), async (req, res) => {
    try {
        const { key, value, description } = req.body;
        
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        
        const result = await pool.query(
            `INSERT INTO system_settings (key, value, description, updated_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [key, value, description || null, req.user.userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating setting:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Setting key already exists' });
        }
        res.status(500).json({ error: 'Failed to create setting' });
    }
});

module.exports = router;
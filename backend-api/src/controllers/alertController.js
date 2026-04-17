// =============================================
// ARCHIVO: backend-api/src/controllers/alertController.js
// Controlador de Alertas
// =============================================
const pool = require('../config/database');

const getAlerts = async (req, res, next) => {
    try {
        const { status, camera_id, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT a.*, c.name as camera_name, z.name as zone_name,
                   ac.name as category_name, u.username as confirmed_by_username
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

        query += ` ORDER BY a.detected_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ alerts: result.rows });
    } catch (error) {
        next(error);
    }
};

const createAlert = async (req, res, next) => {
    try {
        const { camera_id, category_id, confidence, image_path } = req.body;

        const result = await pool.query(
            `INSERT INTO alerts (camera_id, category_id, confidence, image_path, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING *`,
            [camera_id, category_id || null, confidence, image_path || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAlerts, createAlert };
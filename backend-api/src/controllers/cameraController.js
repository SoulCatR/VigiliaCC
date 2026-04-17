// =============================================
// ARCHIVO: backend-api/src/controllers/cameraController.js
// Controlador de Cámaras
// =============================================
const pool = require('../config/database');

const getAllCameras = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT c.*, z.name as zone_name, z.floor,
                   COUNT(a.id) as total_alerts
            FROM cameras c
            LEFT JOIN zones z ON c.zone_id = z.id
            LEFT JOIN alerts a ON c.id = a.camera_id 
                AND a.detected_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY c.id, z.name, z.floor
            ORDER BY c.name
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const createCamera = async (req, res, next) => {
    try {
        const { name, ip_address, rtsp_url, zone_id, model, resolution, fps } = req.body;

        if (!name || !ip_address) {
            return res.status(400).json({ error: 'name and ip_address are required' });
        }

        const result = await pool.query(
            `INSERT INTO cameras (name, ip_address, rtsp_url, zone_id, model, resolution, fps, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
             RETURNING *`,
            [name, ip_address, rtsp_url || null, zone_id || null, model || null, 
             resolution || '1080p', fps || 30]
        );

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'CREATE_CAMERA', 'cameras', result.rows[0].id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateCameraStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const result = await pool.query(
            'UPDATE cameras SET status = $1, last_ping = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllCameras, createCamera, updateCameraStatus };
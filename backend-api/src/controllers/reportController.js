// =============================================
// ARCHIVO: backend-api/src/controllers/reportController.js
// Controlador de Reportes
// =============================================
const pool = require('../config/database');

const getDashboardKPIs = async (req, res, next) => {
    try {
        const [alertsToday, confirmedToday, activeIncidents, activeCameras] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM alerts WHERE DATE(detected_at) = CURRENT_DATE'),
            pool.query('SELECT COUNT(*) as total FROM alerts WHERE status = \'confirmed\' AND DATE(detected_at) = CURRENT_DATE'),
            pool.query('SELECT COUNT(*) as total FROM incidents WHERE resolved = FALSE'),
            pool.query('SELECT COUNT(*) as total FROM cameras WHERE status = \'active\'')
        ]);

        res.json({
            alerts_today: parseInt(alertsToday.rows[0].total),
            confirmed_today: parseInt(confirmedToday.rows[0].total),
            active_incidents: parseInt(activeIncidents.rows[0].total),
            active_cameras: parseInt(activeCameras.rows[0].total)
        });
    } catch (error) {
        next(error);
    }
};

const getAlertsByDay = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT DATE(detected_at) as date, 
                   COUNT(*) as count,
                   COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                   COUNT(*) FILTER (WHERE status = 'discarded') as discarded
            FROM alerts
            WHERE detected_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(detected_at)
            ORDER BY date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAlertsByZone = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT z.name as zone_name, z.floor, COUNT(a.id) as alert_count
            FROM zones z
            LEFT JOIN cameras c ON z.id = c.zone_id
            LEFT JOIN alerts a ON c.id = a.camera_id
            WHERE a.detected_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY z.id, z.name, z.floor
            ORDER BY alert_count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAlertsByCategory = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ac.name as category_name, ac.severity, 
                   COUNT(a.id) as count,
                   AVG(a.confidence) as avg_confidence
            FROM alert_categories ac
            LEFT JOIN alerts a ON ac.id = a.category_id
            WHERE a.detected_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY ac.id, ac.name, ac.severity
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    getDashboardKPIs, 
    getAlertsByDay, 
    getAlertsByZone, 
    getAlertsByCategory 
};
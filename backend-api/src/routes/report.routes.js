// =============================================
// ARCHIVO: backend-api/src/routes/report.routes.js
// Rutas de Reportes y Estadísticas
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reportes y estadísticas del sistema
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     summary: Obtener estadísticas del dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertsToday:
 *                   type: integer
 *                   example: 12
 *                 activeCameras:
 *                   type: string
 *                   example: "8/10"
 *                 confirmedIncidents:
 *                   type: integer
 *                   example: 3
 *                 avgResponseTime:
 *                   type: string
 *                   example: "3.2 min"
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // 1. Alertas de hoy
        const alertsTodayResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM alerts 
             WHERE DATE(detected_at) = CURRENT_DATE`
        );
        const alertsToday = parseInt(alertsTodayResult.rows[0].count);

        // 2. Cámaras activas vs total
        const camerasResult = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) as total
             FROM cameras`
        );
        const activeCameras = `${camerasResult.rows[0].active}/${camerasResult.rows[0].total}`;

        // 3. Incidentes confirmados (alertas confirmadas)
        const incidentsResult = await pool.query(
            `SELECT COUNT(*) as count 
             FROM alerts 
             WHERE status = 'confirmed'`
        );
        const confirmedIncidents = parseInt(incidentsResult.rows[0].count);

        // 4. Tiempo promedio de respuesta (diferencia entre detected_at y confirmed_at)
        const avgTimeResult = await pool.query(
            `SELECT 
                AVG(EXTRACT(EPOCH FROM (confirmed_at - detected_at))/60) as avg_minutes
             FROM alerts 
             WHERE confirmed_at IS NOT NULL 
             AND detected_at IS NOT NULL`
        );
        
        const avgMinutes = avgTimeResult.rows[0].avg_minutes 
            ? parseFloat(avgTimeResult.rows[0].avg_minutes).toFixed(1)
            : '0';
        const avgResponseTime = `${avgMinutes} min`;

        res.json({
            alertsToday,
            activeCameras,
            confirmedIncidents,
            avgResponseTime,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

/**
 * @swagger
 * /reports/alerts-by-day:
 *   get:
 *     summary: Obtener alertas agrupadas por día (últimos 7 días)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos para gráfico de líneas
 */
router.get('/alerts-by-day', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                DATE(detected_at) as date,
                COUNT(*) as count
             FROM alerts
             WHERE detected_at >= CURRENT_DATE - INTERVAL '7 days'
             GROUP BY DATE(detected_at)
             ORDER BY date ASC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alerts by day:', error);
        res.status(500).json({ error: 'Failed to fetch alerts by day' });
    }
});

/**
 * @swagger
 * /reports/alerts-by-camera:
 *   get:
 *     summary: Obtener alertas agrupadas por cámara
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos para gráfico de barras
 */
router.get('/alerts-by-camera', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                c.name as camera_name,
                COUNT(a.id) as alert_count
             FROM cameras c
             LEFT JOIN alerts a ON c.id = a.camera_id
             GROUP BY c.id, c.name
             ORDER BY alert_count DESC
             LIMIT 10`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alerts by camera:', error);
        res.status(500).json({ error: 'Failed to fetch alerts by camera' });
    }
});

/**
 * @swagger
 * /reports/alerts-by-category:
 *   get:
 *     summary: Obtener alertas agrupadas por categoría
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos para gráfico de torta
 */
router.get('/alerts-by-category', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COALESCE(ac.name, 'Sin categoría') as category_name,
                COUNT(a.id) as count
             FROM alerts a
             LEFT JOIN alert_categories ac ON a.category_id = ac.id
             GROUP BY ac.name
             ORDER BY count DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alerts by category:', error);
        res.status(500).json({ error: 'Failed to fetch alerts by category' });
    }
});

/**
 * @swagger
 * /reports/alerts-by-zone:
 *   get:
 *     summary: Obtener alertas agrupadas por zona
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos para gráfico de torta
 */
router.get('/alerts-by-zone', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT z.name as zone_name, COUNT(a.id) as alert_count
            FROM zones z
            LEFT JOIN cameras c ON c.zone_id = z.id
            LEFT JOIN alerts a ON a.camera_id = c.id
            WHERE a.detected_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY z.name
            ORDER BY alert_count DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts by zone' });
    }
});

/**
 * @swagger
 * /reports/top-zone:
 *   get:
 *     summary: Obtener zona con más actividad
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Zona más activa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 zone_name:
 *                   type: string
 *                 alert_count:
 *                   type: integer
 */
router.get('/top-zone', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT z.name as zone_name, COUNT(a.id) as alert_count
            FROM zones z
            LEFT JOIN cameras c ON c.zone_id = z.id
            LEFT JOIN alerts a ON a.camera_id = c.id
            WHERE a.detected_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY z.name
            ORDER BY alert_count DESC
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            return res.json({ zone_name: 'Sin datos', alert_count: 0 });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching top zone:', error);
        res.status(500).json({ error: 'Failed to fetch top zone' });
    }
});

/**
 * @swagger
 * /reports/active-users-today:
 *   get:
 *     summary: Obtener usuarios activos hoy
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cantidad de usuarios activos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
router.get('/active-users-today', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM audit_logs
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        res.json({ count: parseInt(result.rows[0].count) || 0 });
    } catch (error) {
        console.error('Error fetching active users:', error);
        // Si no existe audit_logs, devolver 0
        res.json({ count: 0 });
    }
});

module.exports = router;
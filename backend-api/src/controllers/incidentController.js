// =============================================
// ARCHIVO: backend-api/src/controllers/incidentController.js
// Controlador de Incidentes
// =============================================
const pool = require('../config/database');

const getAllIncidents = async (req, res, next) => {
    try {
        const { resolved, date_from, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT i.*, a.confidence, c.name as camera_name, z.name as zone_name,
                   u1.username as reported_by_username,
                   u2.username as resolved_by_username
            FROM incidents i
            LEFT JOIN alerts a ON i.alert_id = a.id
            LEFT JOIN cameras c ON a.camera_id = c.id
            LEFT JOIN zones z ON c.zone_id = z.id
            LEFT JOIN users u1 ON i.reported_by = u1.id
            LEFT JOIN users u2 ON i.resolved_by = u2.id
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
        next(error);
    }
};

const createIncident = async (req, res, next) => {
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
        next(error);
    }
};

const resolveIncident = async (req, res, next) => {
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

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'RESOLVE_INCIDENT', 'incidents', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllIncidents, createIncident, resolveIncident };
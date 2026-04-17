// =============================================
// ARCHIVO: backend-api/src/routes/detection.routes.js
// Proxy entre Frontend y Python (YOLOv5)
// =============================================
const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

// Crear carpeta de capturas si no existe
const CAPTURES_DIR = path.join(__dirname, '../../captures');
if (!fs.existsSync(CAPTURES_DIR)) {
    fs.mkdirSync(CAPTURES_DIR, { recursive: true });
    console.log('📁 Carpeta captures/ creada');
}

// URL del backend Python (ajusta según tu configuración)
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

/**
 * @swagger
 * /detect:
 *   post:
 *     summary: Detectar objetos en imagen usando YOLOv5
 *     tags: [Detection]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Imagen en base64
 *               camera_id:
 *                 type: integer
 *                 description: ID de la cámara
 *     responses:
 *       200:
 *         description: Detecciones encontradas
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { image, camera_id } = req.body;

        if (!image) {
            return res.status(400).json({ 
                success: false,
                error: 'Image is required' 
            });
        }

        console.log(`[Detection] Processing image from camera ${camera_id}...`);

        // Enviar imagen al backend Python para detección
        const startTime = Date.now();
        
        const pythonResponse = await axios.post(
            `${PYTHON_API_URL}/detect`,
            { image },
            { 
                timeout: 10000, // 10 segundos timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const detectionTime = Date.now() - startTime;
        console.log(`[Detection] Completed in ${detectionTime}ms`);

        const detections = pythonResponse.data.detections || [];

        // ✅ Crear alertas automáticas cuando detecta personas con alta confianza
        const criticalDetections = detections.filter(
            det => det.label === 'person' && det.confidence > 0.70
        );

        if (criticalDetections.length > 0 && camera_id) {
            try {
                // Obtener el category_id de "Aglomeración" o "Merodeo"
                const categoryName = criticalDetections.length > 3 
                    ? 'Aglomeración'
                    : 'Merodeo';

                const categoryResult = await pool.query(
                    'SELECT id FROM alert_categories WHERE name = $1',
                    [categoryName]
                );

                if (categoryResult.rows.length > 0) {
                    const categoryId = categoryResult.rows[0].id;
                    const maxConfidence = Math.max(...criticalDetections.map(d => d.confidence));
                    // ✅ GUARDAR IMAGEN CAPTURADA
                    let imagePath = null;
                    try {
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filename = `alert_cam${camera_id}_${timestamp}.jpg`;
                        const fullPath = path.join(CAPTURES_DIR, filename);
                        
                        // Obtener la imagen del request original
                        if (image) {
                            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                            fs.writeFileSync(fullPath, base64Data, 'base64');
                            imagePath = `/captures/${filename}`;
                            console.log(`📸 Imagen guardada: ${filename}`);
                        }
                    } catch (imageError) {
                        console.error('❌ Error guardando imagen:', imageError.message);
                    }

                    // ✅ INSERT corregido con columnas correctas
                    await pool.query(
                        `INSERT INTO alerts (camera_id, category_id, confidence, status, detected_at, image_path)
                        VALUES ($1, $2, $3, 'pending', NOW(), $4)`,
                        [camera_id, categoryId, maxConfidence, imagePath]
                    );

                    console.log(`🚨 Alerta creada: ${categoryName} en cámara ${camera_id} (${criticalDetections.length} personas)`);
                }
            } catch (error) {
                console.error('❌ Error creando alerta:', error.message);
                // No fallar la detección si falla crear la alerta
            }
        }

        res.json({
            success: true,
            detections: detections,
            detection_time_ms: detectionTime,
            alerts_created: criticalDetections.length
        });

    } catch (error) {
        console.error('[Detection] Error:', error.message);

        // Si es error de timeout o conexión con Python
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Python AI service is not available',
                message: 'Asegúrate de que el backend Python esté corriendo en ' + PYTHON_API_URL
            });
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                error: 'Detection timeout',
                message: 'La detección tardó demasiado tiempo'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Detection failed',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /detect/status:
 *   get:
 *     summary: Verificar estado del servicio de detección
 *     tags: [Detection]
 *     responses:
 *       200:
 *         description: Estado del servicio
 */
router.get('/status', async (req, res) => {
    try {
        const pythonResponse = await axios.get(`${PYTHON_API_URL}/health`, {
            timeout: 3000
        });

        res.json({
            status: 'ok',
            python_service: pythonResponse.data
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            python_service: 'offline',
            message: error.message
        });
    }
});

module.exports = router;
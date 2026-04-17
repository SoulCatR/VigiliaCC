// =============================================
// ARCHIVO: server.js
// API REST - VigiliaCC
// Stack: Node.js + Express + PostgreSQL + JWT
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const swaggerSpec = require('./config/swagger.config');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// =============================================
// MIDDLEWARES GLOBALES
// =============================================
app.use(helmet({ 
    contentSecurityPolicy: false // Necesario para Swagger UI
}));
// CORS general para API
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ CORS específico para imágenes estáticas
app.use('/captures', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});
// ✅ Servir imágenes de capturas
const path = require('path');
app.use('/captures', express.static(path.join(__dirname, '../captures')));
console.log('📁 Carpeta /captures servida en http://localhost:3000/captures');

// ✅ PARSEAR JSON Y URL-ENCODED
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));


// =============================================
// SWAGGER UI - DOCUMENTACIÓN API
// =============================================
const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VigiliaCC API - Swagger UI',
    customfavIcon: '/assets/favicon.ico'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Ruta para obtener el JSON de Swagger
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// =============================================
// IMPORTAR RUTAS
// =============================================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const cameraRoutes = require('./routes/camera.routes');
const alertRoutes = require('./routes/alert.routes');
const incidentRoutes = require('./routes/incident.routes');
const zoneRoutes = require('./routes/zone.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');
const detectionRouter = require('./routes/detection.routes');
const settingsRoutes = require('./routes/settings.routes');
const commentRoutes = require('./routes/comment.routes');
const passwordResetRoutes = require('./routes/password-reset.routes');
const alertHistoryRoutes = require('./routes/alert-history.routes');

// =============================================
// REGISTRO DE RUTAS
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/detect', detectionRouter);
app.use('/api/settings', settingsRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/alert-history', alertHistoryRoutes);

// =============================================
// RUTA DE HEALTH CHECK
// =============================================
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health Check del API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: VigiliaCC API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'VigiliaCC API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// =============================================
// RUTA RAÍZ - REDIRECCIÓN A DOCS
// =============================================
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// =============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// =============================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        suggestion: 'Check /api-docs for available endpoints'
    });
});

// =============================================
// MANEJO CENTRALIZADO DE ERRORES
// =============================================
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 VigiliaCC API Server');
    console.log('='.repeat(60));
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`💾 Database: ${process.env.DB_NAME || 'vigiliacc_dev'}`);
    console.log('='.repeat(60));
});

module.exports = app;
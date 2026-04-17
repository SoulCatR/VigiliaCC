// =============================================
// ARCHIVO: src/config/swagger.config.js
// Configuración de Swagger UI
// =============================================

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VigilIA API',
            version: '2.0.0',
            description: 'API REST para sistema de vigilancia inteligente con YOLOv5',
            contact: {
                name: 'VigiliaCC Team',
                email: 'support@vigiliacc.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Servidor de Desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Ingresa el token JWT obtenido del login'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Error message' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        username: { type: 'string', example: 'vigilante1' },
                        email: { type: 'string', example: 'vigilante1@test.com' },
                        role: { type: 'string', example: 'vigilante' }
                    }
                },
                Camera: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Cámara Principal' },
                        ip_address: { type: 'string', example: '192.168.1.100' },
                        status: { type: 'string', enum: ['active', 'inactive', 'maintenance'] }
                    }
                },
                Alert: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        camera_id: { type: 'integer', example: 1 },
                        confidence: { type: 'number', format: 'float', example: 0.89 },
                        status: { type: 'string', enum: ['pending', 'confirmed', 'discarded'] }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    // 🔥 RUTAS CORREGIDAS PARA TU ESTRUCTURA
    // Desde: src/config/swagger.config.js
    // Hacia: src/routes/*.js y src/server.js
    apis: [
        path.join(__dirname, '..', 'routes', '*.js'),      // src/routes/*.js
        path.join(__dirname, '..', 'server.js')            // src/server.js
    ]
};

console.log('📂 Swagger Config - Rutas de archivos:');
console.log('  Config ubicado en:', __dirname);
console.log('  Buscando rutas en:', path.join(__dirname, '..', 'routes', '*.js'));
console.log('  Buscando server en:', path.join(__dirname, '..', 'server.js'));

const swaggerSpec = swaggerJsdoc(options);

// Debug: verificar paths
if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    console.warn('\n⚠️  WARNING: No se encontraron endpoints');
    console.warn('💡 Verifica que los archivos de rutas tengan comentarios @swagger\n');
} else {
    console.log('✅ Endpoints encontrados:', Object.keys(swaggerSpec.paths).length, '\n');
}

module.exports = swaggerSpec;
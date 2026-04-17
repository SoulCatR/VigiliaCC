// =============================================
// ARCHIVO: backend-api/src/middleware/errorHandler.js
// Manejo Centralizado de Errores
// =============================================
const errorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);

    // Error de base de datos
    if (err.code === '23505') {
        return res.status(409).json({
            error: 'Duplicate entry',
            message: 'The resource already exists'
        });
    }

    // Error de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.message
        });
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }

    // Error genérico
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
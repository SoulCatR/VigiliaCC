// =============================================
// ARCHIVO: backend-api/src/config/jwt.js
// Configuración JWT
// =============================================
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_esto_por_secret_seguro';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
};

module.exports = { generateToken, verifyToken, JWT_SECRET };
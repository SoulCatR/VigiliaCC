// =============================================
// ARCHIVO: backend-api/src/middleware/validator.js
// Validación de Datos
// =============================================
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const loginValidation = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
];

const userValidation = [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    validate
];

const alertValidation = [
    body('camera_id').isInt().withMessage('Camera ID must be an integer'),
    body('confidence').isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1'),
    validate
];

module.exports = {
    validate,
    loginValidation,
    userValidation,
    alertValidation
};
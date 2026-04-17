// =============================================
// ARCHIVO: backend-api/src/routes/password-reset.routes.js
// HU002 - Recuperación de Contraseña
// =============================================
const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();

/**
 * @swagger
 * /password-reset/request:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token de recuperación generado
 */
router.post('/request', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }
        
        // Verificar que el usuario existe
        const userResult = await pool.query(
            'SELECT id, username FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            // Por seguridad, siempre respondemos exitosamente
            return res.json({ 
                message: 'Si el email existe, recibirás instrucciones de recuperación' 
            });
        }
        
        const user = userResult.rows[0];
        
        // Generar token de 6 dígitos
        const resetToken = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        
        // Guardar token en BD
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
            [user.id, resetToken, expiresAt]
        );
        
        // TODO: Enviar email con el token (por ahora solo consola)
        console.log(`\n🔐 Token de recuperación para ${email}: ${resetToken}\n`);
        
        res.json({ 
            message: 'Si el email existe, recibirás instrucciones de recuperación',
            // SOLO PARA DESARROLLO - ELIMINAR EN PRODUCCIÓN:
            dev_token: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
    } catch (error) {
        console.error('Error en password reset request:', error);
        res.status(500).json({ error: 'Error al procesar solicitud' });
    }
});

/**
 * @swagger
 * /password-reset/verify:
 *   post:
 *     summary: Verificar token de recuperación
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token válido
 */
router.post('/verify', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ error: 'Email y token son requeridos' });
        }
        
        const result = await pool.query(
            `SELECT prt.*, u.id as user_id
             FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE u.email = $1 AND prt.token = $2 AND prt.expires_at > NOW()`,
            [email, token]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }
        
        res.json({ message: 'Token válido', valid: true });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({ error: 'Error al verificar token' });
    }
});

/**
 * @swagger
 * /password-reset/reset:
 *   post:
 *     summary: Restablecer contraseña
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 */
router.post('/reset', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        
        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        // Verificar token
        const tokenResult = await pool.query(
            `SELECT prt.*, u.id as user_id
             FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE u.email = $1 AND prt.token = $2 AND prt.expires_at > NOW()`,
            [email, token]
        );
        
        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }
        
        const userId = tokenResult.rows[0].user_id;
        
        // Hash de la nueva contraseña
        const passwordHash = await bcrypt.hash(newPassword, 10);
        
        // Actualizar contraseña
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, userId]
        );
        
        // Eliminar token usado
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
        
        console.log(`✅ Contraseña actualizada para usuario ID: ${userId}`);
        
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Error al restablecer contraseña' });
    }
});

module.exports = router;
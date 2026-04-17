// =============================================
// ARCHIVO: backend-api/src/routes/comment.routes.js
// Rutas de Comentarios en Alertas
// =============================================
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: Comentarios en alertas
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ApiError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *     CreateAlertCommentRequest:
 *       type: object
 *       properties:
 *         comment:
 *           type: string
 *           minLength: 1
 *       required: [comment]
 *     AlertComment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         alert_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         comment:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         username:
 *           type: string
 *           nullable: true
 *         full_name:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /alerts/{alert_id}/comments:
 *   get:
 *     summary: Lista comentarios de una alerta
 *     description: Obtiene los comentarios asociados a una alerta específica, incluyendo datos públicos del usuario.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alert_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la alerta
 *     responses:
 *       200:
 *         description: Lista de comentarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AlertComment'
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/:alert_id', authenticateToken, async (req, res) => {
  try {
    const { alert_id } = req.params;

    const result = await pool.query(
      `SELECT ac.*, u.username, u.full_name
       FROM alert_comments ac
       LEFT JOIN users u ON ac.user_id = u.id
       WHERE ac.alert_id = $1
       ORDER BY ac.created_at ASC`,
      [alert_id]
    );

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * @swagger
 * /alerts/{alert_id}/comments:
 *   post:
 *     summary: Crea un comentario en una alerta
 *     description: Crea un comentario asociado a una alerta. Requiere JWT (se usa userId del token).
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alert_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la alerta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAlertCommentRequest'
 *     responses:
 *       201:
 *         description: Comentario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlertComment'
 *       400:
 *         description: El campo comment es requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post('/:alert_id', authenticateToken, async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const result = await pool.query(
      `INSERT INTO alert_comments (alert_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [alert_id, req.user.userId, comment.trim()]
    );

    // Obtener el comentario con información del usuario
    const commentWithUser = await pool.query(
      `SELECT ac.*, u.username, u.full_name
       FROM alert_comments ac
       LEFT JOIN users u ON ac.user_id = u.id
       WHERE ac.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(commentWithUser.rows[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Elimina un comentario
 *     description: Elimina un comentario si pertenece al usuario autenticado o si el usuario tiene rol Admin/SuperAdmin.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comentario
 *     responses:
 *       200:
 *         description: Comentario eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       403:
 *         description: No autorizado para eliminar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Comentario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el comentario pertenece al usuario o sea admin
    const comment = await pool.query(
      'SELECT * FROM alert_comments WHERE id = $1',
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (
      comment.rows[0].user_id !== req.user.userId &&
      req.user.role !== 'Admin' &&
      req.user.role !== 'SuperAdmin'
    ) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await pool.query('DELETE FROM alert_comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted successfully' });
   } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Elimina un comentario
 *     description: Elimina un comentario si pertenece al usuario autenticado o si el usuario tiene rol Admin/SuperAdmin.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del comentario a eliminar
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: Comentario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       403:
 *         description: No autorizado para eliminar el comentario (no es dueño ni admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Comentario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: No autorizado (JWT faltante o inválido)
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el comentario existe y obtener info
        const comment = await pool.query(
            'SELECT user_id FROM alert_comments WHERE id = $1',
            [id]
        );
        
        if (comment.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Verificar permisos: solo el autor o admin pueden eliminar
        const isOwner = comment.rows[0].user_id === req.user.userId;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'SuperAdmin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }
        
        // Eliminar comentario
        await pool.query('DELETE FROM alert_comments WHERE id = $1', [id]);
        
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

module.exports = router;
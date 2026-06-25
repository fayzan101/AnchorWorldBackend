import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ValidationUtil } from '../utils/validation.util';
import { validate } from '../middleware/validation.middleware';
import { messageLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();
const messageController = new MessageController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations
 * @access  Private
 */
router.get('/conversations', messageController.getConversations);

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', messageController.getUnreadCount);

/**
 * @route   GET /api/messages/:userId
 * @desc    Get chat history with a user
 * @access  Private
 */
router.get(
  '/:userId',
  ValidationUtil.pagination(),
  validate,
  messageController.getChatHistory
);

/**
 * @route   POST /api/messages/:userId
 * @desc    Send message to user
 * @access  Private
 */
router.post(
  '/:userId',
  messageLimiter,
  ValidationUtil.sendMessage(),
  validate,
  messageController.sendMessage
);

/**
 * @route   PUT /api/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/:messageId/read', messageController.markAsRead);

/**
 * @route   PUT /api/messages/:userId/read-all
 * @desc    Mark all messages from user as read
 * @access  Private
 */
router.put('/:userId/read-all', messageController.markAllAsRead);

/**
 * @route   DELETE /api/messages/:userId
 * @desc    Delete conversation with user
 * @access  Private
 */
router.delete('/:userId', messageController.deleteConversation);

export default router;
import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const notificationController = new NotificationController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/notifications/fcm-token
 * @desc    Update user's FCM token
 * @access  Private
 */
router.post("/fcm-token", notificationController.updateFCMToken);

/**
 * @route   DELETE /api/notifications/fcm-token
 * @desc    Remove user's FCM token (on logout)
 * @access  Private
 */
router.delete("/fcm-token", notificationController.removeFCMToken);

/**
 * @route   PUT /api/notifications/toggle
 * @desc    Enable/disable notifications
 * @access  Private
 */
router.put("/toggle", notificationController.toggleNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Unread notification count
 * @access  Private
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", notificationController.markAllAsRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark one notification as read
 * @access  Private
 */
router.put("/:id/read", notificationController.markAsRead);

/**
 * @route   POST /api/notifications
 * @desc    List notifications
 * @access  Private
 */
router.post("/", notificationController.findNotification);

export default router;

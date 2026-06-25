import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const followController = new FollowController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/follows/:userId
 * @desc    Send follow request to user
 * @access  Private
 */
router.post('/:userId', followController.sendFollowRequest);

/**
 * @route   PUT /api/follows/:followId/accept
 * @desc    Accept follow request
 * @access  Private
 */
router.put('/:followId/accept', followController.acceptFollowRequest);

/**
 * @route   DELETE /api/follows/:followId
 * @desc    Remove/reject follow
 * @access  Private
 */
router.delete('/:followId', followController.removeFollow);

/**
 * @route   GET /api/follows/pending
 * @desc    Get pending follow requests
 * @access  Private
 */
router.get('/pending', followController.getPendingRequests);

/**
 * @route   GET /api/follows/matches
 * @desc    Get mutual follows (matches)
 * @access  Private
 */
router.get('/matches', followController.getMatches);

export default router;
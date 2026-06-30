import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { deprecationHeader } from '../middleware/deprecation.middleware';

const router = Router();
const followController = new FollowController();

router.use(authenticateToken);

/**
 * @route   GET /api/follows/pending
 * @desc    Get pending follow requests
 * @access  Private
 */
router.get('/pending', followController.getPendingRequests);

/**
 * @route   GET /api/follows/connections
 * @desc    Get mutual connections
 * @access  Private
 */
router.get('/connections', followController.getConnections);

/**
 * @route   GET /api/follows/matches
 * @desc    Get mutual connections (deprecated alias)
 * @access  Private
 */
router.get(
  '/matches',
  deprecationHeader('endpoint="/api/follows/matches"; use="/api/follows/connections"'),
  followController.getMatches
);

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

export default router;

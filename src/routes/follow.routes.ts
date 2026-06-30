import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { deprecationHeader } from '../middleware/deprecation.middleware';

const router = Router();
const followController = new FollowController();

router.use(authenticateToken);

router.get('/pending', followController.getPendingRequests);
router.get('/connections', followController.getConnections);
router.get(
  '/matches',
  deprecationHeader('endpoint="/api/follows/matches"; use="/api/follows/connections"'),
  followController.getMatches
);

router.post('/:userId', followController.sendFollowRequest);
router.put('/:followId/accept', followController.acceptFollowRequest);
router.delete('/:followId', followController.removeFollow);

export default router;

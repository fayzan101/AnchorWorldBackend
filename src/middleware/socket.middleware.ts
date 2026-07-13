import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.util';
import { JwtPayload } from '../types';

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export const authenticateSocket = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyAccessToken(token);
    socket.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Invalid token'));
      }
    }
    next(new Error('Authentication failed'));
  }
};
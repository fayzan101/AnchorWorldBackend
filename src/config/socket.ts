import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { config } from './environment';
import { SocketHandler } from '../socket/socket.handler';
import { authenticateSocket } from '../middleware/socket.middleware';

export const initializeSocket = (httpServer: HTTPServer): Server => {
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: config.socket.corsOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  };

  const io = new Server(httpServer, socketOptions);

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Initialize socket handler
  const socketHandler = new SocketHandler(io);

  // Handle connections
  io.on('connection', (socket) => {
    socketHandler.handleConnection(socket as any);
  });

  console.log('✅ Socket.IO initialized successfully');

  return io;
};

export default initializeSocket;
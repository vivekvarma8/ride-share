import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { setupSocketIO } from './sockets/socket-handler';

const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

server.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  RouteMate API Server running on port ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Allowed Domains: ${config.allowedEmailDomains.join(', ')}`);
  console.log(`  Socket.IO: Active`);
  console.log(`====================================================`);
});

export { server, io };

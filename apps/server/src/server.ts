import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { setupSocketIO } from './sockets/socket-handler';
import { prisma } from './utils/prisma';
import { hashPassword } from './utils/password';

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

async function bootstrapAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashPassword(adminPassword),
          name: 'System Administrator',
          role: 'ADMIN',
          department: 'Corporate Mobility & Platform Operations',
          phoneNumber: '+91-98765-43200',
          bio: 'RouteMate Enterprise Platform Administrator.',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          isActive: true,
        },
      });
      console.log(`[Bootstrap] Initialized Administrator account: ${adminEmail} (password: ${adminPassword})`);
    } else {
      // Ensure role is ADMIN and password is set
      const passwordHash = hashPassword(adminPassword);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          role: 'ADMIN',
          passwordHash,
          isActive: true,
        },
      });
      console.log(`[Bootstrap] Verified Administrator credentials: ${adminEmail}`);
    }
  } catch (err: any) {
    console.warn('[Bootstrap] Notice checking admin account:', err.message);
  }
}

server.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`  RouteMate API Server running on port ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Allowed Domains: ${config.allowedEmailDomains.join(', ')}`);
  console.log(`  Socket.IO: Active`);
  console.log(`====================================================`);

  await bootstrapAdmin();
});

export { server, io };

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning Database & Initializing Admin Account ---');

  // Purge all existing tables in reverse relational dependency order
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('All previous test and mock records successfully removed.');

  // Create ONLY the secure System Administrator account
  const admin = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      passwordHash: hashPassword('admin@123'),
      name: 'System Administrator',
      role: Role.ADMIN,
      department: 'Corporate Mobility & Platform Operations',
      phoneNumber: '+91-98765-43200',
      bio: 'RouteMate Enterprise Platform Administrator. Responsible for platform safety, compliance, and user verification.',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isActive: true,
    },
  });

  console.log('Initialized single secure admin user:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  console.log('Zero mock passengers or drivers created. System is ready for real user onboarding.');
}

main()
  .catch((e) => {
    console.error('Database Initialization Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

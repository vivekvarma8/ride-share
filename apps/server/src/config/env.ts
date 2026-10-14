import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to local directory .env

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rideshare_db?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_jwt_key_at_least_32_characters_long_for_commute_circle!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'gmail.com,yahoo.com,outlook.com,routemate.com,enterprise.com,company.com,corp.com')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// This tells the Neon driver to use the 'ws' package for WebSockets in Node.js
neonConfig.webSocketConstructor = ws;

// Use Pool instead of the neon() function
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);
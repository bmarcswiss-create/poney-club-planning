mport { neon } from '@neondatabase/serverless';

// Cette ligne permet de se connecter à Neon en utilisant la variable de Vercel
export const sql = neon(process.env.DATABASE_URL);
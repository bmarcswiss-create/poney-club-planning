'use server' // Obligatoire pour Vercel
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// 1. Lire les membres
export async function getMembres() {
  const data = await sql`SELECT * FROM membres ORDER BY id ASC`;
  return data;
}

// 2. Ajouter ou modifier un membre
export async function saveMembre(membre) {
  if (membre.id && membre.id > 1000000) { // C'est un nouvel ID temporaire
    await sql`
      INSERT INTO membres (nom, role, total, repos)
      VALUES (${membre.nom}, ${membre.role}, ${membre.total}, ${membre.repos})
    `;
  } else if (membre.id) {
    await sql`
      UPDATE membres 
      SET nom = ${membre.nom}, role = ${membre.role}, total = ${membre.total}, repos = ${membre.repos}
      WHERE id = ${membre.id}
    `;
  }
}

// 3. Supprimer un membre
export async function deleteMembre(id) {
  await sql`DELETE FROM membres WHERE id = ${id}`;
}
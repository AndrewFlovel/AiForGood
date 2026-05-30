const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
  const connectionString = 'postgresql://postgres.ytteimsocjxsbshunbws:adminIAFORGOOD@aws-1-us-east-1.pooler.supabase.com:6543/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('¡Conectado exitosamente a Supabase usando el Connection Pooler IPv4!');
    
    // Cleanup any partial execution
    console.log('Limpiando tablas anteriores si existen...');
    const cleanupSql = `
      DROP MATERIALIZED VIEW IF EXISTS mv_pdv_real_times CASCADE;
      DROP TABLE IF EXISTS restock_requests CASCADE;
      DROP TABLE IF EXISTS product_issues CASCADE;
      DROP TABLE IF EXISTS visit_microtasks CASCADE;
      DROP TABLE IF EXISTS visits CASCADE;
      DROP TABLE IF EXISTS route_stops CASCADE;
      DROP TABLE IF EXISTS routes CASCADE;
      DROP TABLE IF EXISTS microtasks CASCADE;
      DROP TABLE IF EXISTS pdv_assignments CASCADE;
      DROP TABLE IF EXISTS pdvs CASCADE;
      DROP TABLE IF EXISTS client_types CASCADE;
      DROP TABLE IF EXISTS product_categories CASCADE;
      DROP TABLE IF EXISTS markets CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS client_category CASCADE;
      DROP TYPE IF EXISTS route_status CASCADE;
      DROP TYPE IF EXISTS stop_status CASCADE;
      DROP TYPE IF EXISTS visit_status CASCADE;
      DROP TYPE IF EXISTS request_urgency CASCADE;
      DROP TYPE IF EXISTS request_status CASCADE;
      DROP TYPE IF EXISTS issue_reason CASCADE;
    `;
    await client.query(cleanupSql);

    const sql = fs.readFileSync('venado_schema.sql', 'utf8');
    console.log('Inyectando el esquema venado_schema.sql en la base de datos...');
    
    await client.query(sql);
    console.log('¡Esquema y datos cargados con éxito!');
  } catch (err) {
    console.error('Error ejecutando el esquema:', err);
  } finally {
    await client.end();
  }
}

runMigration();

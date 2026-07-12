const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/transist/TransitOps/backend/.env' });
const pool = new Pool();
pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

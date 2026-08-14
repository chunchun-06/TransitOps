const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'barath@2007', database: 'transitops' });
pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('vehicles', 'trips', 'fuel', 'drivers') ORDER BY table_name, ordinal_position")
  .then(r => { r.rows.forEach(row => console.log(row.table_name + '.' + row.column_name + ':' + row.data_type)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });

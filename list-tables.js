const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'survey',
  user: 'HMS_SvcAcc',
  password: 'Obiron70',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function list() {
  try {
    const pool = await sql.connect(config);
    const r = await pool.request().query(
      "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Property%' OR TABLE_NAME LIKE '%Asset%' ORDER BY TABLE_SCHEMA, TABLE_NAME"
    );
    console.log(JSON.stringify(r.recordset, null, 2));
    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

list();

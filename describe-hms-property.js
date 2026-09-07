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

async function run() {
  try {
    const pool = await sql.connect(config);
    const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='HMS' AND TABLE_NAME='PropertyCustomFields'");
    console.log('Columns:', JSON.stringify(cols.recordset, null, 2));
    const sample = await pool.request().query('SELECT TOP 20 * FROM HMS.PropertyCustomFields');
    console.log('Sample rows:', JSON.stringify(sample.recordset.slice(0,10), null, 2));
    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

run();

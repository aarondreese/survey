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

    const q = `
      SELECT TOP 200 * FROM HMS.PropertyCustomFields
      WHERE LOWER([Name]) LIKE '%heat%'
         OR LOWER([Label]) LIKE '%heat%'
         OR LOWER(CustomShortText) LIKE '%gas%'
         OR LOWER(CustomLongText) LIKE '%gas%'
         OR LOWER(CustomShortText) LIKE '%heat pump%'
         OR LOWER(CustomLongText) LIKE '%heat pump%'
         OR LOWER(CustomShortText) LIKE '%ground source%'
         OR LOWER(CustomLongText) LIKE '%ground source%'
         OR LOWER([Name]) LIKE '%boiler%'
         OR LOWER([Label]) LIKE '%boiler%'
    `;

    const r = await pool.request().query(q);
    console.log('Matches:', JSON.stringify(r.recordset, null, 2));

    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

run();

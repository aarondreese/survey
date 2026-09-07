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

const keywords = ['heat', 'heating', 'boiler', 'fuel', 'gas', 'pump'];

async function run() {
  try {
    const pool = await sql.connect(config);

    // Find columns with keywords in their name
    const cols = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE LOWER(COLUMN_NAME) LIKE '%heat%'
         OR LOWER(COLUMN_NAME) LIKE '%heating%'
         OR LOWER(COLUMN_NAME) LIKE '%boiler%'
         OR LOWER(COLUMN_NAME) LIKE '%fuel%'
         OR LOWER(COLUMN_NAME) LIKE '%gas%'
         OR LOWER(COLUMN_NAME) LIKE '%pump%'
      ORDER BY TABLE_NAME
    `);

    console.log('Columns matching keywords:');
    console.log(JSON.stringify(cols.recordset, null, 2));

    // For each distinct table, sample rows to see values
    const tables = [...new Set(cols.recordset.map(r => `${r.TABLE_SCHEMA}.${r.TABLE_NAME}`))];

    for (const t of tables) {
      const [schema, table] = t.split('.');
      console.log(`\nSampling values from ${schema}.${table}:`);
      try {
        const sample = await pool.request().query(`SELECT TOP 10 * FROM ${schema}.${table}`);
        console.log(JSON.stringify(sample.recordset.slice(0,5), null, 2));
      } catch (e) {
        console.error('Error sampling', t, e.message);
      }
    }

    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

run();

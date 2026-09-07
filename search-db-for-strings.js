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

const searchStrings = ['Natural Gas', 'Ground Source Heat Pump', 'Ground Source', 'Heat Pump', 'NaturalGas'];

async function run() {
  try {
    const pool = await sql.connect(config);
    const cols = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE DATA_TYPE IN ('varchar','nvarchar','text','char','nchar')
        AND TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
      ORDER BY TABLE_NAME
    `);

    console.log('Scanning', cols.recordset.length, 'columns');

    for (const col of cols.recordset) {
      const schema = col.TABLE_SCHEMA;
      const table = col.TABLE_NAME;
      const column = col.COLUMN_NAME;
      for (const s of searchStrings) {
        const q = `SELECT TOP 1 * FROM ${schema}.${table} WHERE ${column} LIKE @pat`;
        try {
          const r = await pool.request().input('pat', `%${s}%`).query(q);
          if (r.recordset.length > 0) {
            console.log('Found match');
            console.log('Schema:', schema, 'Table:', table, 'Column:', column, 'String:', s);
            console.log(JSON.stringify(r.recordset[0], null, 2));
            await pool.close();
            return;
          }
        } catch (e) {
          // ignore errors like permission or non-text conversion
        }
      }
    }

    console.log('No matches found for search strings');
    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

run();

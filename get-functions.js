const sql = require("mssql");

const config = {
  server: "localhost",
  database: "survey",
  user: "HMS_SvcAcc",
  password: "Obiron70",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function getFunctions() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        ROUTINE_NAME,
        ROUTINE_TYPE
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'FUNCTION'
      ORDER BY ROUTINE_NAME
    `);
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

getFunctions();

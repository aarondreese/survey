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

async function findTables() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Asset%' OR TABLE_NAME LIKE '%Property%'
      ORDER BY TABLE_NAME
    `);
    console.log("Tables with Asset or Property:");
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

findTables();

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

async function introspectStoredProc() {
  try {
    const pool = await sql.connect(config);

    console.log("=== usp_GenerateSurvey Stored Procedure ===\n");

    // Get parameters
    console.log("Parameters:");
    const params = await pool.request().query(`
      SELECT 
        PARAMETER_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        PARAMETER_MODE
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = 'usp_GenerateSurvey'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(params.recordset, null, 2));

    // Get the procedure definition
    console.log("\n=== Procedure Definition ===\n");
    const def = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('usp_GenerateSurvey')) AS definition
    `);
    console.log(def.recordset[0].definition);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

introspectStoredProc();

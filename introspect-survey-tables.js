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

async function introspectSurveyTables() {
  try {
    const pool = await sql.connect(config);

    // Get all survey/template related tables
    console.log("=== Survey/Template Tables ===");
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Survey%' OR TABLE_NAME LIKE '%Template%'
      ORDER BY TABLE_NAME
    `);
    console.log(JSON.stringify(tables.recordset, null, 2));

    // Get SurveyTemplateHeader structure
    console.log("\n=== SurveyTemplateHeader Structure ===");
    const headerCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SurveyTemplateHeader'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(headerCols.recordset, null, 2));

    // Get SurveyTemplateQuestion structure
    console.log("\n=== SurveyTemplateQuestion Structure ===");
    const questionCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SurveyTemplateQuestion'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(questionCols.recordset, null, 2));

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

introspectSurveyTables();

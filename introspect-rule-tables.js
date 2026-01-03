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

async function introspectRuleTables() {
  try {
    const pool = await sql.connect(config);

    console.log("=== SurveyRule Table Structure ===\n");
    const surveyRuleCols = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH, 
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SurveyRule'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(surveyRuleCols.recordset, null, 2));

    console.log("\n=== SurveyTemplateQuestionRule Table Structure ===\n");
    const ruleItemCols = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH, 
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SurveyTemplateQuestionRule'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(ruleItemCols.recordset, null, 2));

    // Get foreign key relationships
    console.log("\n=== Foreign Key Relationships ===\n");
    const fks = await pool.request().query(`
      SELECT 
        fk.name AS FK_Name,
        tp.name AS Parent_Table,
        cp.name AS Parent_Column,
        tr.name AS Referenced_Table,
        cr.name AS Referenced_Column
      FROM sys.foreign_keys AS fk
      INNER JOIN sys.tables AS tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables AS tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns AS cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
      INNER JOIN sys.columns AS cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
      WHERE tp.name IN ('SurveyRule', 'SurveyTemplateQuestionRule')
      ORDER BY tp.name, fk.name
    `);
    console.log(JSON.stringify(fks.recordset, null, 2));

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

introspectRuleTables();

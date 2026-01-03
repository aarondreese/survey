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

async function introspectTables() {
  try {
    await sql.connect(config);

    console.log("\n=== MetaQuestionHeader Table Structure ===\n");
    const metaQuestionResult = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'MetaQuestionHeader'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(JSON.stringify(metaQuestionResult.recordset, null, 2));

    console.log("\n=== MetaQuestionAnswer Table Structure ===\n");
    const metaAnswerResult = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'MetaQuestionAnswer'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(JSON.stringify(metaAnswerResult.recordset, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.close();
  }
}

introspectTables();

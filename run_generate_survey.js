const sql = require("mssql");

const config = {
  server: "localhost",
  database: "survey",
  user: "HMS_SvcAcc",
  password: "Obiron70",
  port: 1433,
  options: { encrypt: true, trustServerCertificate: true },
};

async function run() {
  try {
    const pool = await sql.connect(config);
    const res = await pool
      .request()
      .query(`EXEC usp_GenerateSurvey @TemplateID = 1, @AssetID = 36`);
    console.log("rows:", JSON.stringify(res.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

const sql = require("mssql");

const config = {
  server: "localhost",
  database: "survey",
  user: "HMS_SvcAcc",
  password: "Obiron70",
  port: 1433,
  options: { encrypt: true, trustServerCertificate: true },
};

async function run(templateId = 1, assetId = 36) {
  let pool;
  try {
    pool = await sql.connect(config);
    const res = await pool
      .request()
      .query(
        `EXEC usp_GenerateSurvey @TemplateID = ${templateId}, @AssetID = ${assetId}`,
      );
    const rows = res.recordset;
    if (!rows || rows.length === 0) {
      console.error("No rows returned from usp_GenerateSurvey");
      return;
    }

    // Build pages by parsing JSONText/ParsedJSON similar to survey-generator
    const pages = rows
      .map((r) => {
        let parsed = null;
        try {
          parsed = JSON.parse(r.JSONText);
        } catch (e) {
          parsed = r.ParsedJSON || null;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (
            first &&
            typeof first === "object" &&
            "type" in first &&
            !("elements" in first)
          ) {
            parsed = { elements: parsed };
          } else if (Array.isArray(parsed) && parsed.length === 1) {
            parsed = parsed[0];
          }
        }
        const page =
          parsed && parsed.elements ? { elements: parsed.elements } : parsed;
        return page;
      })
      .filter(Boolean);

    const surveyToSave = { pages, data: {} };
    const jsonString = JSON.stringify(surveyToSave);

    const insertRes = await pool
      .request()
      .input("SurveyTemplateHeaderID", sql.Int, templateId)
      .input("EntityReference", sql.VarChar(100), `Asset_${assetId}`)
      .input("SurveyJSON", sql.NVarChar(sql.MAX), jsonString)
      .query(`INSERT INTO SurveyInstance (SurveyTemplateHeaderID, EntityReference, SurveyJSON, InstanceCreatedDate)
             OUTPUT INSERTED.ID
             VALUES (@SurveyTemplateHeaderID, @EntityReference, @SurveyJSON, GETDATE())`);

    const newId = insertRes.recordset[0].ID;
    console.log("Inserted SurveyInstance ID:", newId);

    // Fetch back the inserted row
    const fetch = await pool
      .request()
      .input("ID", sql.Int, newId)
      .query("SELECT * FROM SurveyInstance WHERE ID = @ID");
    console.log(
      "Stored SurveyJSON (excerpt):",
      String(fetch.recordset[0].SurveyJSON).substring(0, 1000),
    );
  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (pool) await pool.close();
  }
}

run();

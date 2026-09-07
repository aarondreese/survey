const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'survey',
  user: 'HMS_SvcAcc',
  password: 'Obiron70',
  port: 1433,
  options: { encrypt: true, trustServerCertificate: true }
};

async function run(id) {
  try {
    const pool = await sql.connect(config);
    const res = await pool.request().input('ID', sql.Int, id).query(`SELECT * FROM SurveyInstance WHERE ID = @ID`);
    console.log(JSON.stringify(res.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

run(1037);

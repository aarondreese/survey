const sql = require('mssql');

const dbConfig = {
  server: 'localhost',
  database: 'survey',
  user: 'HMS_SvcAcc',
  password: 'Obiron70',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  }
};

async function introspectCustomFieldType() {
  try {
    await sql.connect(dbConfig);
    console.log('=== CustomFieldType Table Data ===\n');
    
    const result = await sql.query`SELECT * FROM hms.CustomFieldType ORDER BY ID`;
    console.log(JSON.stringify(result.recordset, null, 2));
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

introspectCustomFieldType();

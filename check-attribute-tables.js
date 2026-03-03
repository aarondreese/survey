const sql = require('mssql');

const config = {
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

async function introspectAttributeTables() {
  try {
    await sql.connect(config);
    
    // Find all tables with attribute or custom in the name
    console.log('=== Tables with Attribute/Custom in name ===\n');
    const tables = await sql.query`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Attribute%' OR TABLE_NAME LIKE '%Custom%' OR TABLE_NAME LIKE '%Field%'
      ORDER BY TABLE_NAME
    `;
    console.log(JSON.stringify(tables.recordset, null, 2));
    
    // Check if vw_QuestionSetFieldDetail or similar exists
    console.log('\n=== Views with QuestionSet in name ===\n');
    const views = await sql.query`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME LIKE '%QuestionSet%'
      ORDER BY TABLE_NAME
    `;
    console.log(JSON.stringify(views.recordset, null, 2));
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

introspectAttributeTables();

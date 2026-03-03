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

async function checkFieldMapping() {
  try {
    await sql.connect(config);
    
    // Check HMS schema tables with custom field info
    console.log('=== HMS Schema Tables ===\n');
    const hmsTables = await sql.query`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'hms'
      ORDER BY TABLE_NAME
    `;
    console.log(JSON.stringify(hmsTables.recordset, null, 2));
    
    // Check AttributeSource table structure
    console.log('\n=== HMS.AttributeSource Structure ===\n');
    const attrCols = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'hms' AND TABLE_NAME = 'AttributeSource'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(JSON.stringify(attrCols.recordset, null, 2));
    
    // Get sample data
    console.log('\n=== HMS.AttributeSource Sample Data ===\n');
    const attrData = await sql.query`
      SELECT TOP 5 * FROM hms.AttributeSource
    `;
    console.log(JSON.stringify(attrData.recordset, null, 2));
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkFieldMapping();

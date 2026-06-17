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

async function checkQuestionSetViews() {
  try {
    await sql.connect(config);
    
    // Get questionsets with their source views
    console.log('=== QuestionSets with Source Views ===\n');
    const questionSets = await sql.query`
      SELECT TOP 5 ID, Description, SourceViewName 
      FROM dbo.QuestionSetHeader 
      WHERE SourceViewName IS NOT NULL
    `;
    console.log(JSON.stringify(questionSets.recordset, null, 2));
    
    // Check if the source view has a fieldType column
    if (questionSets.recordset.length > 0) {
      const viewName = questionSets.recordset[0].SourceViewName;
      console.log(`\n=== Checking columns in view: ${viewName} ===\n`);
      
      try {
        const columns = await sql.query`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = ${viewName}
        `;
        console.log(JSON.stringify(columns.recordset, null, 2));
        
        // Get sample data from the view
        console.log(`\n=== Sample data from ${viewName} ===\n`);
        const sampleData = await sql.query`SELECT TOP 1 * FROM ${sql.Table(viewName)}`;
        console.log(JSON.stringify(sampleData.recordset, null, 2));
      } catch {
        console.log('Could not query view directly, might need schema prefix');
      }
    }
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkQuestionSetViews();

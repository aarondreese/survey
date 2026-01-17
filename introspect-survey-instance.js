const sql = require('mssql');

const config = {
  server: "localhost",
  database: "survey",
  user: "HMS_SvcAcc",
  password: "Obiron70",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function introspectSurveyInstance() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Get table structure
    const columns = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SurveyInstance'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('\n=== SurveyInstance Table Structure ===');
    console.log(JSON.stringify(columns.recordset, null, 2));

    // Check for primary key
    const pk = await sql.query`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
      AND TABLE_NAME = 'SurveyInstance'
    `;

    console.log('\n=== Primary Key ===');
    console.log(JSON.stringify(pk.recordset, null, 2));

    // Check for foreign keys
    const fk = await sql.query`
      SELECT 
        fk.name AS FK_Name,
        tp.name AS Parent_Table,
        cp.name AS Parent_Column,
        tr.name AS Referenced_Table,
        cr.name AS Referenced_Column
      FROM sys.foreign_keys AS fk
      INNER JOIN sys.tables AS tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.tables AS tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
      WHERE tp.name = 'SurveyInstance'
    `;

    console.log('\n=== Foreign Keys ===');
    console.log(JSON.stringify(fk.recordset, null, 2));

    await sql.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

introspectSurveyInstance();

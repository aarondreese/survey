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

async function introspectAddressProperty() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Get HMS.Address structure
    console.log('\n=== HMS.Address Structure ===');
    const addressColumns = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'HMS' AND TABLE_NAME = 'Address'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(JSON.stringify(addressColumns.recordset, null, 2));

    // Get HMS.Property structure
    console.log('\n=== HMS.Property Structure ===');
    const propertyColumns = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'HMS' AND TABLE_NAME = 'Property'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(JSON.stringify(propertyColumns.recordset, null, 2));

    // Sample data from Address
    console.log('\n=== Sample HMS.Address Data (top 5) ===');
    const addressSample = await sql.query`
      SELECT TOP 5 * FROM HMS.Address
    `;
    console.log(JSON.stringify(addressSample.recordset, null, 2));

    // Sample data from Property
    console.log('\n=== Sample HMS.Property Data (top 5) ===');
    const propertySample = await sql.query`
      SELECT TOP 5 * FROM HMS.Property
    `;
    console.log(JSON.stringify(propertySample.recordset, null, 2));

    // Check relationship
    console.log('\n=== Property-Address Relationship Sample ===');
    const relationship = await sql.query`
      SELECT TOP 5
        p.ID as PropertyID,
        p.AddressID,
        a.AddressLine1,
        a.AddressLine2,
        a.Town,
        a.County,
        a.PostCode
      FROM HMS.Property p
      LEFT JOIN HMS.Address a ON p.AddressID = a.ID
      WHERE p.AddressID IS NOT NULL
    `;
    console.log(JSON.stringify(relationship.recordset, null, 2));

    await sql.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

introspectAddressProperty();

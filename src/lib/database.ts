import sql from 'mssql';

// Database configuration interface
interface DatabaseConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
  };
  pool?: {
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
}

// Extended config for connection string
interface DatabaseConfigWithConnectionString extends Omit<DatabaseConfig, 'server' | 'database' | 'user' | 'password'> {
  connectionString: string;
}

// Get database configuration from environment variables
function getDatabaseConfig(): DatabaseConfig | DatabaseConfigWithConnectionString {
  // Check if DATABASE_URL is provided (connection string format)
  if (process.env.DATABASE_URL) {
    // Parse connection string format
    const connectionString = process.env.DATABASE_URL;
    
    // For connection string, we'll use it directly with mssql
    return {
      connectionString,
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        idleTimeoutMillis: 30000,
      },
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'),
      requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '15000'),
    };
  }

  // Use individual environment variables
  const config: DatabaseConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '15000'),
  };

  return config;
}

// Global connection pool
let pool: sql.ConnectionPool | null = null;

// Get database connection pool
export async function getDatabase(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      const config = getDatabaseConfig();
      
      // If using connection string
      if ('connectionString' in config) {
        pool = new sql.ConnectionPool(config.connectionString);
      } else {
        pool = new sql.ConnectionPool(config);
      }

      await pool.connect();
      
      console.log('Connected to MSSQL database successfully');
      
      // Handle pool errors
      pool.on('error', (err) => {
        console.error('Database pool error:', err);
        pool = null; // Reset pool on error
      });
      
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  return pool;
}

// Execute a query with parameters
export async function executeQuery<T = unknown>(
  query: string, 
  params: Record<string, unknown> = {}
): Promise<T[]> {
  try {
    const db = await getDatabase();
    const request = db.request();

    // Add parameters to request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', query);
    console.error('Parameters:', params);
    throw error;
  }
}

// Execute a stored procedure
export async function executeStoredProcedure<T = unknown>(
  procedureName: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  try {
    const db = await getDatabase();
    const request = db.request();

    // Add parameters to request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.execute(procedureName);
    return result.recordset as T[];
  } catch (error) {
    console.error('Stored procedure execution error:', error);
    console.error('Procedure:', procedureName);
    console.error('Parameters:', params);
    throw error;
  }
}

// Close database connection (useful for cleanup)
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await executeQuery<{ test: number }>('SELECT 1 as test');
    return result.length > 0 && result[0].test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Export sql types for use in other files
export { sql };
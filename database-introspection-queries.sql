-- SQL queries to inspect the QuestionSetHeader table structure
-- Run these queries in your database to get the table schema

-- For SQL Server:
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'QuestionSetHeader'
ORDER BY ORDINAL_POSITION;

-- For PostgreSQL:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'questionsetheader'
ORDER BY ordinal_position;

-- For MySQL:
DESCRIBE QuestionSetHeader;

-- Or for MySQL using INFORMATION_SCHEMA:
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'QuestionSetHeader' AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;

-- For SQLite:
PRAGMA table_info(QuestionSetHeader);

-- Alternative SQLite query:
.schema QuestionSetHeader
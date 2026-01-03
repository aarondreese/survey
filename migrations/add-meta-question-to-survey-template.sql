-- Migration: Add Meta-Question support to SurveyTemplateQuestion
-- This allows survey templates to include both Question Sets and Meta-Questions

-- Step 1: Add the QuestionType discriminator field
ALTER TABLE SurveyTemplateQuestion
ADD QuestionType VARCHAR(20) NOT NULL DEFAULT 'QuestionSet';

-- Step 2: Make QuestionSetHeaderID nullable
ALTER TABLE SurveyTemplateQuestion
ALTER COLUMN QuestionSetHeaderID INT NULL;

-- Step 3: Add MetaQuestionHeaderID field
ALTER TABLE SurveyTemplateQuestion
ADD MetaQuestionHeaderID INT NULL;

-- Step 4: Add foreign key constraint for MetaQuestionHeaderID
ALTER TABLE SurveyTemplateQuestion
ADD CONSTRAINT FK_SurveyTemplateQuestion_MetaQuestionHeader 
FOREIGN KEY (MetaQuestionHeaderID) REFERENCES MetaQuestionHeader(ID);

-- Step 5: Add check constraint to ensure exactly one type is populated
ALTER TABLE SurveyTemplateQuestion
ADD CONSTRAINT CK_SurveyTemplateQuestion_QuestionType 
CHECK (
  (QuestionType = 'QuestionSet' AND QuestionSetHeaderID IS NOT NULL AND MetaQuestionHeaderID IS NULL)
  OR
  (QuestionType = 'MetaQuestion' AND MetaQuestionHeaderID IS NOT NULL AND QuestionSetHeaderID IS NULL)
);

-- Step 6: Create index for better query performance
CREATE INDEX IX_SurveyTemplateQuestion_QuestionType 
ON SurveyTemplateQuestion(SurveyTemplateHeaderID, QuestionType, SortOrder);

-- Verify the changes
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SurveyTemplateQuestion'
ORDER BY ORDINAL_POSITION;

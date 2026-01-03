import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, sql } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get survey template questions with enriched data (both QuestionSets and MetaQuestions)
    const query = `
      SELECT 
        stq.ID as id,
        stq.SurveyTemplateHeaderID as surveyTemplateHeaderId,
        stq.QuestionType as questionType,
        stq.QuestionSetHeaderID as questionSetHeaderId,
        stq.MetaQuestionHeaderID as metaQuestionHeaderId,
        stq.SortOrder as sortOrder,
        stq.isActive,
        -- QuestionSetHeader data
        qsh.Name as questionSetName,
        qsh.Description as questionSetDescription,
        qsh.SourceViewName as sourceViewName,
        qsh.subscript,
        -- MetaQuestionHeader data
        mqh.Description as metaQuestionDescription,
        -- Counts
        (SELECT COUNT(*) FROM QuestionSetQuestion qsq WHERE qsq.QuestionSetHeaderID = stq.QuestionSetHeaderID AND qsq.isVisible = 1) as questionCount,
        (SELECT COUNT(*) FROM MetaQuestionAnswer mqa WHERE mqa.MetaQuestionHeaderID = stq.MetaQuestionHeaderID) as answerCount
      FROM SurveyTemplateQuestion stq
      LEFT JOIN QuestionSetHeader qsh ON stq.QuestionSetHeaderID = qsh.ID
      LEFT JOIN MetaQuestionHeader mqh ON stq.MetaQuestionHeaderID = mqh.ID
      WHERE stq.SurveyTemplateHeaderID = @surveyId
      ORDER BY stq.SortOrder ASC, stq.ID ASC
    `;

    const queryRequest = db.request();
    queryRequest.input('surveyId', sql.Int, parseInt(surveyId));
    const result = await queryRequest.query(query);

    // Get detailed questions for each question set
    const templateQuestions = [];
    
    for (const row of result.recordset) {
      if (row.questionType === 'QuestionSet' && row.questionSetHeaderId) {
        // Get questions for this question set
        const questionsQuery = `
          SELECT 
            ID as id,
            QuestionSetHeaderID as questionSetHeaderId,
            FieldName as fieldName,
            AttributeLabel as attributeLabel,
            SurveyLabel as surveyLabel,
            DisplayType as displayType,
            Choices as choices,
            Description as description,
            isRequired,
            isVisible,
            SortOrder as sortOrder
          FROM QuestionSetQuestion
          WHERE QuestionSetHeaderID = @questionSetHeaderId
            AND isVisible = 1
          ORDER BY SortOrder ASC, ID ASC
        `;

        const questionsRequest = db.request();
        questionsRequest.input('questionSetHeaderId', sql.Int, row.questionSetHeaderId);
        const questionsResult = await questionsRequest.query(questionsQuery);

        templateQuestions.push({
          id: row.id,
          surveyTemplateHeaderId: row.surveyTemplateHeaderId,
          questionType: 'QuestionSet',
          questionSetHeaderId: row.questionSetHeaderId,
          metaQuestionHeaderId: null,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          questionSetHeader: {
            id: row.questionSetHeaderId,
            name: row.questionSetName,
            description: row.questionSetDescription,
            sourceViewName: row.sourceViewName,
            subscript: row.subscript
          },
          questions: questionsResult.recordset.map((q: any) => ({
            id: q.id,
            questionSetHeaderId: q.questionSetHeaderId,
            fieldName: q.fieldName,
            attributeLabel: q.attributeLabel,
            surveyLabel: q.surveyLabel,
            displayType: q.displayType,
            choices: q.choices,
            description: q.description,
            isRequired: q.isRequired,
            isVisible: q.isVisible,
            sortOrder: q.sortOrder
          }))
        });
      } else if (row.questionType === 'MetaQuestion' && row.metaQuestionHeaderId) {
        templateQuestions.push({
          id: row.id,
          surveyTemplateHeaderId: row.surveyTemplateHeaderId,
          questionType: 'MetaQuestion',
          questionSetHeaderId: null,
          metaQuestionHeaderId: row.metaQuestionHeaderId,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          metaQuestionHeader: {
            id: row.metaQuestionHeaderId,
            description: row.metaQuestionDescription
          },
          answerCount: row.answerCount || 0
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: templateQuestions
    });

  } catch (error) {
    console.error('Error fetching survey template questions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch survey template questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
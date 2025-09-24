import { NextResponse } from "next/server";

// Mock data - replace with your actual database queries
const mockQuestions = {
  1: [ // Customer Satisfaction Survey
    {
      id: 101,
      questionSetId: 1,
      questionText: "What is your name?",
      questionType: "text",
      sortOrder: 1,
      isRequired: true,
      options: null
    },
    {
      id: 102,
      questionSetId: 1,
      questionText: "How satisfied are you with our service?",
      questionType: "rating",
      sortOrder: 2,
      isRequired: true,
      options: "1-5 scale"
    }
  ],
  2: [ // Property Inspection Checklist
    {
      id: 201,
      questionSetId: 2,
      questionText: "What is the property type?",
      questionType: "dropdown",
      sortOrder: 1,
      isRequired: true,
      options: "House,Apartment,Commercial,Industrial"
    },
    {
      id: 202,
      questionSetId: 2,
      questionText: "Overall property condition",
      questionType: "dropdown",
      sortOrder: 2,
      isRequired: true,
      options: "Excellent,Good,Fair,Poor"
    },
    {
      id: 203,
      questionSetId: 2,
      questionText: "Additional notes",
      questionType: "text",
      sortOrder: 3,
      isRequired: false,
      options: null
    }
  ],
  3: [ // Solar System Assessment
    {
      id: 301,
      questionSetId: 3,
      questionText: "Solar Type",
      questionType: "radiogroup",
      sortOrder: 1,
      isRequired: false,
      options: "Hybrid,Photovoltaic,Thermal,PIV"
    },
    {
      id: 302,
      questionSetId: 3,
      questionText: "Output Rating",
      questionType: "number",
      sortOrder: 2,
      isRequired: false,
      options: null
    },
    {
      id: 303,
      questionSetId: 3,
      questionText: "Fitted Date",
      questionType: "date",
      sortOrder: 3,
      isRequired: false,
      options: null
    },
    {
      id: 304,
      questionSetId: 3,
      questionText: "Last Service Date",
      questionType: "date",
      sortOrder: 4,
      isRequired: false,
      options: null
    },
    {
      id: 305,
      questionSetId: 3,
      questionText: "Condition",
      questionType: "dropdown",
      sortOrder: 5,
      isRequired: false,
      options: "Broken,Damaged,Failed,Fair,Good,Missing,New,Poor"
    }
  ]
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const questionSetId = parseInt(params.id);
    
    // Replace this with your actual database query
    // Example: const questions = await db.questionSetQuestion.findMany({
    //   where: { questionSetId: questionSetId },
    //   orderBy: { sortOrder: 'asc' }
    // });
    
    const questions = mockQuestions[questionSetId as keyof typeof mockQuestions] || [];
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
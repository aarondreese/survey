import { NextResponse } from "next/server";
import { QuestionSetService } from "@/services/questionSetService";
import { CreateQuestionSetRequest, ApiResponse } from "@/types/database";

export async function GET() {
  try {
    const questionSets = await QuestionSetService.getAll();
    
    const response: ApiResponse = {
      success: true,
      data: questionSets
    };
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching question sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch question sets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateQuestionSetRequest = await request.json();
    
    console.log('POST /api/questionsets - Request body:', body);
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      console.error('Validation failed: Name is required');
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Create new question set using service
    console.log('Creating question set with data:', body);
    const newQuestionSet = await QuestionSetService.create(body);
    console.log('Question set created successfully:', newQuestionSet);
    
    const response: ApiResponse = {
      success: true,
      data: newQuestionSet
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating question set:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: "Failed to create question set",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
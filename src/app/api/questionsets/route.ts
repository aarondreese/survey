import { NextResponse } from "next/server";

// Mock data - replace with your actual database queries
const mockQuestionSets = [
  {
    id: 1,
    name: "Customer Satisfaction Survey",
    description: "Standard customer satisfaction questions",
    createdDate: "2025-01-15T10:00:00Z",
    isActive: true
  },
  {
    id: 2,
    name: "Property Inspection Checklist",
    description: "Comprehensive property inspection questions",
    createdDate: "2025-02-01T14:30:00Z",
    isActive: true
  },
  {
    id: 3,
    name: "Solar System Assessment",
    description: "Solar system evaluation questions",
    createdDate: "2025-02-10T09:15:00Z",
    isActive: true
  }
];

export async function GET() {
  try {
    // Replace this with your actual database query
    // Example: const questionSets = await db.questionSetHeader.findMany();
    
    return NextResponse.json(mockQuestionSets);
  } catch (error) {
    console.error("Error fetching question sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch question sets" },
      { status: 500 }
    );
  }
}
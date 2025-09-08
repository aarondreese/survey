import { NextResponse } from "next/server";

export async function GET() {
  // A simple survey definition
  const survey = {
    title: "Customer Feedback Survey",
    pages: [
      {
        name: "page1",
        elements: [
          {
            type: "text",
            name: "customerName",
            title: "What is your name?"
          },
          {
            type: "rating",
            name: "satisfaction",
            title: "How satisfied are you with our service?",
            minRateDescription: "Not Satisfied",
            maxRateDescription: "Completely satisfied"
          }
        ]
      }
    ]
  };
  return NextResponse.json(survey);
}

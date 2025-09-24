"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
}

interface QuestionSetQuestion {
  id: number;
  questionSetHeaderId: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string;
  description?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  colCount?: number;
  isReadOnly: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isBlind: boolean;
  minIsCurrent: boolean;
  sortOrder: number;
}

// Helper function to render choices as pills
const renderChoicesPills = (choices: string) => {
  try {
    const parsedChoices = JSON.parse(choices);
    
    if (Array.isArray(parsedChoices)) {
      return parsedChoices.map((choice, index) => {
        let displayText = '';
        
        if (typeof choice === 'object' && choice !== null) {
          // Handle common choice object formats
          displayText = choice.Text || choice.text || choice.label || choice.name || choice.title || 
                       (choice.value !== undefined ? String(choice.value) : JSON.stringify(choice));
        } else {
          displayText = String(choice);
        }
        
        return (
          <span 
            key={index}
            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
          >
            {displayText}
          </span>
        );
      });
    } else if (typeof parsedChoices === 'object' && parsedChoices !== null) {
      return Object.entries(parsedChoices).map(([key, value], index) => (
        <span 
          key={index}
          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
        >
          {typeof value === 'object' ? `${key}: ${JSON.stringify(value)}` : `${key}: ${value}`}
        </span>
      ));
    } else {
      return (
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">
          {String(parsedChoices)}
        </span>
      );
    }
  } catch {
    // If it's not valid JSON, display as plain text
    return (
      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mr-1 mb-1">
        {choices}
      </span>
    );
  }
};

export default function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState<QuestionSetHeader[]>([]);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSetHeader | null>(null);
  const [questions, setQuestions] = useState<QuestionSetQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Load all question sets on component mount
  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const fetchQuestionSets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/questionsets");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both array response and object with data property
      const questionSetsData = Array.isArray(data) ? data : (data.data || []);
      
      setQuestionSets(questionSetsData);
    } catch (error) {
      console.error("Error fetching question sets:", error);
      setQuestionSets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (questionSetId: number) => {
    try {
      setQuestionsLoading(true);
      const response = await fetch(`/api/questionsets/${questionSetId}/questions`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both array response and object with data property
      const questionsData = Array.isArray(data) ? data : (data.data || []);
      
      setQuestions(questionsData);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleQuestionSetSelect = (questionSet: QuestionSetHeader) => {
    setSelectedQuestionSet(questionSet);
    fetchQuestions(questionSet.id);
  };

  if (loading) {
    return <div className="p-4">Loading question sets...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Question Sets</h1>
        <Link
          href="/questionsets/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Question Set
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Sets List */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Question Set Headers</h2>
          
          {questionSets.length === 0 ? (
            <p className="text-gray-500">No question sets found.</p>
          ) : (
            <div className="space-y-2">
              {questionSets.map((questionSet) => (
                <div
                  key={questionSet.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedQuestionSet?.id === questionSet.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => handleQuestionSetSelect(questionSet)}
                >
                  <div className="font-medium">{questionSet.name}</div>
                  {questionSet.description && (
                    <div className="text-sm text-gray-600 mt-1">
                      {questionSet.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {questionSet.id}
                    {questionSet.subscript && (
                      <span className="ml-2">
                        Type: {questionSet.subscript}
                      </span>
                    )}
                    {questionSet.sourceViewName && (
                      <span className="ml-2">
                        Source: {questionSet.sourceViewName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions Details */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Question Details</h2>
          
          {!selectedQuestionSet ? (
            <p className="text-gray-500">Select a question set to view its questions.</p>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <h3 className="font-medium">{selectedQuestionSet.name}</h3>
                {selectedQuestionSet.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedQuestionSet.description}
                  </p>
                )}
              </div>

              {questionsLoading ? (
                <p className="text-gray-500">Loading questions...</p>
              ) : questions.length === 0 ? (
                <p className="text-gray-500">No questions found for this question set.</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <div key={question.id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm text-gray-600">
                          #{question.sortOrder}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {question.displayType}
                        </span>
                      </div>
                      
                      <div className="text-sm font-medium mb-2">
                        {question.surveyLabel || question.attributeLabel}
                      </div>
                      
                      {question.description && (
                        <div className="text-xs text-gray-600 mb-2">
                          {question.description}
                        </div>
                      )}
                      
                      {question.fieldName && (
                        <div className="text-xs text-gray-600 mb-2">
                          Field Name: {question.fieldName}
                        </div>
                      )}
                      
                      {question.placeholder && (
                        <div className="text-xs text-gray-600 mb-2">
                          Placeholder: {question.placeholder}
                        </div>
                      )}
                      
                      {question.choices && (
                        <div className="mb-2 p-2 bg-gray-50 rounded border-l-4 border-blue-200">
                          <div className="text-xs font-medium text-gray-700 mb-2">Available Choices:</div>
                          <div className="flex flex-wrap -mr-1 -mb-1">
                            {renderChoicesPills(question.choices)}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>ID: {question.id}</span>
                        <div className="flex gap-2">
                          {question.isRequired && (
                            <span className="text-red-500">Required</span>
                          )}
                          {question.isReadOnly && (
                            <span className="text-blue-500">Read Only</span>
                          )}
                          {!question.isVisible && (
                            <span className="text-gray-400">Hidden</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
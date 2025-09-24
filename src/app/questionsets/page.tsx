"use client";
import { useState, useEffect } from "react";

interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  createdDate?: string;
  isActive?: boolean;
}

interface QuestionSetQuestion {
  id: number;
  questionSetId: number;
  questionText: string;
  questionType: string;
  sortOrder: number;
  isRequired?: boolean;
  options?: string;
}

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
      // Replace with your actual API endpoint
      const response = await fetch("/api/questionsets");
      const data = await response.json();
      setQuestionSets(data);
    } catch (error) {
      console.error("Error fetching question sets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (questionSetId: number) => {
    try {
      setQuestionsLoading(true);
      // Replace with your actual API endpoint
      const response = await fetch(`/api/questionsets/${questionSetId}/questions`);
      const data = await response.json();
      setQuestions(data);
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
      <h1 className="text-2xl font-bold mb-6">Question Sets</h1>
      
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
                    {questionSet.createdDate && (
                      <span className="ml-2">
                        Created: {new Date(questionSet.createdDate).toLocaleDateString()}
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
                          {question.questionType}
                        </span>
                      </div>
                      
                      <div className="text-sm font-medium mb-2">
                        {question.questionText}
                      </div>
                      
                      {question.options && (
                        <div className="text-xs text-gray-600 mb-2">
                          Options: {question.options}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>ID: {question.id}</span>
                        {question.isRequired && (
                          <span className="text-red-500">Required</span>
                        )}
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
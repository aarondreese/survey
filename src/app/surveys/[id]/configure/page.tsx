'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SurveyTemplateHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
}

interface QuestionSetQuestion {
  id: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  sortOrder: number;
}

interface SurveyTemplateQuestion {
  id: number;
  surveyTemplateHeaderId: number;
  questionSetHeaderId: number;
  sortOrder: number;
  isActive: boolean;
  // Enriched data
  questionSetHeader?: QuestionSetHeader;
  questions?: QuestionSetQuestion[];
}

interface AvailableQuestionSet {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
  questionCount: number;
}

export default function SurveyConfigurePage() {
  const params = useParams();
  const surveyId = params.id as string;

  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateHeader | null>(null);
  const [templateQuestions, setTemplateQuestions] = useState<SurveyTemplateQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableQuestionSets, setAvailableQuestionSets] = useState<AvailableQuestionSet[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchSurveyTemplateData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch survey template header
      const headerResponse = await fetch(`/api/surveys/${surveyId}`);
      if (!headerResponse.ok) {
        throw new Error('Failed to fetch survey template');
      }
      const headerData = await headerResponse.json();
      setSurveyTemplate(headerData.data);

      // Fetch survey template questions with enriched data
      const questionsResponse = await fetch(`/api/surveys/${surveyId}/questions`);
      if (!questionsResponse.ok) {
        throw new Error('Failed to fetch survey template questions');
      }
      const questionsData = await questionsResponse.json();
      setTemplateQuestions(questionsData.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey template data');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyTemplateData();
    }
  }, [surveyId, fetchSurveyTemplateData]);

  const fetchAvailableQuestionSets = React.useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const response = await fetch(`/api/surveys/${surveyId}/available-questionsets`);
      if (!response.ok) {
        throw new Error('Failed to fetch available question sets');
      }
      const data = await response.json();
      setAvailableQuestionSets(data.data || []);
    } catch (err) {
      console.error('Error fetching available question sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load available question sets');
    } finally {
      setLoadingAvailable(false);
    }
  }, [surveyId]);

  const handleAddQuestionSet = async (questionSetId: number) => {
    try {
      setAdding(true);
      setError(null);

      const response = await fetch(`/api/surveys/${surveyId}/add-questionset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionSetHeaderId: questionSetId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add question set');
      }

      // Refresh the survey template data and available question sets
      await fetchSurveyTemplateData();
      await fetchAvailableQuestionSets();
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question set');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    await fetchAvailableQuestionSets();
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback for drop target
    e.currentTarget.classList.add('border-t-2', 'border-blue-500');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-blue-500');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    // Clean up visual feedback
    e.currentTarget.classList.remove('border-t-2', 'border-blue-500');
    
    if (draggedIndex === null) return;
    
    if (draggedIndex !== dropIndex) {
      const newQuestions = [...templateQuestions];
      const draggedQuestion = newQuestions[draggedIndex];
      
      // Remove dragged item
      newQuestions.splice(draggedIndex, 1);
      
      // Insert at new position
      newQuestions.splice(dropIndex, 0, draggedQuestion);
      
      // Update sort orders based on new positions
      const updatedQuestions = newQuestions.map((question, index) => ({
        ...question,
        sortOrder: index + 1
      }));
      
      setTemplateQuestions(updatedQuestions);
      
      // Save the new order to the database
      await saveQuestionSetOrder(updatedQuestions);
    }
    
    setDraggedIndex(null);
  };

  const saveQuestionSetOrder = async (reorderedQuestions: SurveyTemplateQuestion[]) => {
    try {
      setReordering(true);
      setError(null);

      const response = await fetch(`/api/surveys/${surveyId}/reorder-questionsets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reorderedItems: reorderedQuestions.map(q => ({ id: q.id, sortOrder: q.sortOrder }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder question sets');
      }

      console.log('Question sets reordered successfully');
    } catch (err) {
      console.error('Error reordering question sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder question sets');
      // Refresh the data to get the correct order back
      await fetchSurveyTemplateData();
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">Loading survey template...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center text-red-600">Error: {error}</div>
        <div className="text-center mt-4">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  if (!surveyTemplate) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center text-gray-600">Survey template not found</div>
        <div className="text-center mt-4">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">{surveyTemplate.name}</span>
          <span>›</span>
          <span className="text-gray-900">Configure</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Configure Survey Template</h1>
        <p className="text-gray-600 mt-2">
          Manage question sets and their configuration for this survey template
        </p>
      </div>

      {/* Survey Template Header Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{surveyTemplate.name}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  surveyTemplate.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {surveyTemplate.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {surveyTemplate.description && (
                <p className="text-gray-600 mb-4">{surveyTemplate.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Template ID</label>
                  <p className="text-sm text-gray-900">{surveyTemplate.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity Type</label>
                  <p className="text-sm text-gray-900">{surveyTemplate.entityType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Page Split</label>
                  <p className="text-sm text-gray-900">{surveyTemplate.pageSplit}</p>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <Link
                href={`/surveys/${surveyId}/edit`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Template
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Question Sets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Question Sets</h3>
              <p className="text-sm text-gray-600 mt-1">
                {templateQuestions.length} question set{templateQuestions.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question Set
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {templateQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm mb-2">No question sets configured</p>
              <p className="text-xs text-gray-400">Add question sets to define the survey structure</p>
            </div>
          ) : (
            templateQuestions.map((templateQuestion, index) => (
              <div 
                key={templateQuestion.id} 
                className={`p-6 ${draggedIndex === index ? 'opacity-50' : ''} ${reordering ? 'pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Drag handle */}
                    <div className="flex items-center justify-center mt-1">
                      <div 
                        className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        title="Drag to reorder"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {templateQuestion.sortOrder}
                        </div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {templateQuestion.questionSetHeader?.name || `Question Set ${templateQuestion.questionSetHeaderId}`}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          templateQuestion.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {templateQuestion.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    
                    {templateQuestion.questionSetHeader?.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {templateQuestion.questionSetHeader.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Question Set ID</label>
                        <p className="text-sm text-gray-900">{templateQuestion.questionSetHeaderId}</p>
                      </div>
                      {templateQuestion.questionSetHeader?.sourceViewName && (
                        <div>
                          <label className="text-xs font-medium text-gray-700">Source View</label>
                          <p className="text-sm text-gray-900">{templateQuestion.questionSetHeader.sourceViewName}</p>
                        </div>
                      )}
                      {templateQuestion.questionSetHeader?.subscript && (
                        <div>
                          <label className="text-xs font-medium text-gray-700">Type</label>
                          <p className="text-sm text-gray-900">{templateQuestion.questionSetHeader.subscript}</p>
                        </div>
                      )}
                    </div>

                    {/* Questions Preview */}
                    {templateQuestion.questions && templateQuestion.questions.length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-700 mb-2 block">
                          Questions ({templateQuestion.questions.length})
                        </label>
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {templateQuestion.questions.slice(0, 6).map((question) => (
                              <div key={question.id} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  question.isRequired ? 'bg-red-400' : 'bg-gray-300'
                                }`}></div>
                                <span className="text-xs text-gray-700 truncate">
                                  {question.surveyLabel}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                                  {question.displayType}
                                </span>
                              </div>
                            ))}
                            {templateQuestion.questions.length > 6 && (
                              <div className="text-xs text-gray-500 italic">
                                +{templateQuestion.questions.length - 6} more questions
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-6">
                    <Link
                      href={`/questionsets/${templateQuestion.questionSetHeaderId}/configure`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </Link>
                    <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      Options
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {templateQuestions.length > 0 && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Total: {templateQuestions.reduce((sum: number, tq: SurveyTemplateQuestion) => sum + (tq.questions?.length || 0), 0)} questions across {templateQuestions.length} question sets
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs">Required</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-xs">Optional</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Question Set Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Question Set</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Select a question set to add to this survey template
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                </div>
              )}

              {loadingAvailable ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading available question sets...</div>
                </div>
              ) : availableQuestionSets.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 mb-2">No available question sets</p>
                  <p className="text-xs text-gray-400">All question sets are already added to this survey</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableQuestionSets.map((questionSet) => (
                    <div key={questionSet.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{questionSet.name}</h4>
                          {questionSet.description && (
                            <p className="text-sm text-gray-600 mt-1">{questionSet.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>ID: {questionSet.id}</span>
                            {questionSet.sourceViewName && (
                              <span>Source: {questionSet.sourceViewName}</span>
                            )}
                            {questionSet.subscript && (
                              <span>Type: {questionSet.subscript}</span>
                            )}
                            <span>{questionSet.questionCount} questions</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddQuestionSet(questionSet.id)}
                          disabled={adding}
                          className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {adding ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
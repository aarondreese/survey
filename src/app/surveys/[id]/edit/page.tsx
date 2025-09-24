'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SurveyTemplateHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

export default function EditSurveyTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplateHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState('');
  const [pageSplit, setPageSplit] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchSurveyTemplate = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey template');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const template = data.data;
        setSurveyTemplate(template);
        setName(template.name || '');
        setDescription(template.description || '');
        setEntityType(template.entityType || '');
        setPageSplit(template.pageSplit || '');
        setIsActive(template.isActive !== false);
      } else {
        throw new Error('Survey template not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey template');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyTemplate();
    }
  }, [surveyId, fetchSurveyTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Survey template name is required');
      return;
    }

    if (!entityType.trim()) {
      setError('Entity type is required');
      return;
    }

    if (!pageSplit.trim()) {
      setError('Page split is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const surveyData = {
        name: name.trim(),
        description: description.trim() || null,
        entityType: entityType.trim(),
        pageSplit: pageSplit.trim(),
        isActive
      };

      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update survey template');
      }

      if (result.success) {
        router.push('/surveys');
      } else {
        throw new Error(result.error || 'Failed to update survey template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update survey template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center">Loading survey template...</div>
      </div>
    );
  }

  if (error && !surveyTemplate) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center text-red-600">Error: {error}</div>
        <div className="text-center mt-4">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">{surveyTemplate?.name || 'Survey Template'}</span>
          <span>›</span>
          <span className="text-gray-900">Edit</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Survey Template</h1>
        <p className="text-gray-600 mt-2">
          Update the survey template details and settings
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Survey Template Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey template name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey template description (optional)"
              />
            </div>

            {/* Entity Type */}
            <div>
              <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type *
              </label>
              <select
                id="entityType"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select entity type</option>
                <option value="Asset">Asset</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Customer">Customer</option>
                <option value="Tenancy">Tenancy</option>
              </select>
            </div>

            {/* Page Split */}
            <div>
              <label htmlFor="pageSplit" className="block text-sm font-medium text-gray-700 mb-2">
                Page Split *
              </label>
              <input
                type="text"
                id="pageSplit"
                value={pageSplit}
                onChange={(e) => setPageSplit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter page split value (e.g., NONE, SinglePage, etc.)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Specify how the survey should be split across pages
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
              <p className="ml-2 text-xs text-gray-500">
                {isActive ? 'This survey template is active and can be used' : 'This survey template is inactive and cannot be used'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <Link
              href="/surveys"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={`/surveys/${surveyId}/configure`}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Configure Questions
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CreateSurveyForm {
  name: string;
  description: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

const entityTypeOptions = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Vehicle', label: 'Vehicle' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Tenancy', label: 'Tenancy' }
];

export default function CreateSurveyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateSurveyForm>({
    name: '',
    description: '',
    entityType: 'Asset',
    pageSplit: 'NONE',
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof CreateSurveyForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Survey name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Survey name must be at least 3 characters long';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Survey name must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          entityType: formData.entityType,
          pageSplit: formData.pageSplit,
          isActive: formData.isActive
        }),
      });

      if (response.ok) {
        // Redirect to surveys list after successful creation
        router.push('/surveys');
      } else {
        const errorData = await response.json();
        setErrors({
          submit: errorData.error || 'Failed to create survey template'
        });
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      setErrors({
        submit: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/surveys');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">Create New Template</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create Survey Template</h1>
        <p className="text-gray-600 mt-2">
          Create a new survey template that can be used to generate surveys
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Template Information</h2>
          <p className="text-sm text-gray-600 mt-1">
            Provide the basic information for your survey template
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Survey Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Survey Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter survey name"
              maxLength={255}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.name.length}/255 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the purpose and content of this survey template"
              maxLength={1000}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Entity Type */}
          <div>
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entityType"
              value={formData.entityType}
              onChange={(e) => handleInputChange('entityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {entityTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Select the type of entity this template represents
            </p>
          </div>

          {/* Page Split */}
          <div>
            <label htmlFor="pageSplit" className="block text-sm font-medium text-gray-700 mb-2">
              Page Split <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pageSplit"
              value={formData.pageSplit}
              onChange={(e) => handleInputChange('pageSplit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter page split configuration"
            />
            <p className="mt-1 text-sm text-gray-500">
              Specify how the survey pages should be organized (default: NONE)
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (template can be used to create surveys)
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Inactive templates are hidden from survey creation but preserved for existing surveys
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Survey Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">About Survey Templates</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Entity Type:</strong> Select the business entity this survey relates to (Asset, Vehicle, Customer, or Tenancy)</li>
                <li><strong>Page Split:</strong> Custom configuration for organizing survey pages (will be used in later processing steps)</li>
                <li><strong>Status:</strong> Only active templates can be used to create new surveys</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
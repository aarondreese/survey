'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';



interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
}

interface QuestionConfig {
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  options?: string;
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
  // UI state
  isEnabled: boolean;
}

const displayTypeOptions = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' }
];

export default function ConfigureQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const questionSetId = params.id as string;

  const [questionSet, setQuestionSet] = useState<QuestionSetHeader | null>(null);
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);





  const initializeQuestionConfigsFromData = useCallback((records: Record<string, unknown>[]) => {
    if (records.length === 0) {
      setQuestionConfigs([]);
      return;
    }

    // Create question configs from the data records
    const configs: QuestionConfig[] = records.map((record, index) => {
      // Use the 'Label' column for attribute label
      const attributeLabel = String(record.Label || record.label || `Label_${index + 1}`);
      const fieldName = String(record.fieldName || record.FieldName || record.field_name || attributeLabel);
      
      const options = String(record.options || record.Options || '');
      const hasOptions = options && options.trim() !== '';
      
      // Infer display type from field name (remove digits from end)
      const fieldNameBase = fieldName.replace(/\d+$/, '').toLowerCase();
      
      let defaultDisplayType = 'text';
      if (hasOptions) {
        defaultDisplayType = 'dropdown'; // Default to dropdown for lookup fields
      } else if (fieldNameBase.includes('date') || fieldNameBase === 'date') {
        defaultDisplayType = 'date';
      } else if (fieldNameBase.includes('text') || fieldNameBase.includes('comment') || fieldNameBase.includes('note')) {
        defaultDisplayType = 'textarea';
      } else if (fieldNameBase.includes('number') || fieldNameBase.includes('num') || fieldNameBase.includes('count')) {
        defaultDisplayType = 'number';
      } else if (fieldNameBase.includes('check') || fieldNameBase.includes('bool') || fieldNameBase.includes('flag')) {
        defaultDisplayType = 'checkbox';
      } else {
        defaultDisplayType = 'text'; // Default fallback
      }
      
      return {
        fieldName: fieldName,
        attributeLabel: attributeLabel,
        surveyLabel: attributeLabel,
        displayType: defaultDisplayType,
        options: options, // Get options from the data record
        description: String(record.description || ''),
        placeholder: `Enter ${attributeLabel.toLowerCase()}`,
        isReadOnly: false,
        isVisible: true,
        isRequired: false,
        isBlind: false,
        minIsCurrent: false,
        sortOrder: index + 1,
        isEnabled: true
      };
    });
    setQuestionConfigs(configs);
  }, []);

  const fetchQuestionSetAndData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch question set details
      const questionSetResponse = await fetch(`/api/questionsets/${questionSetId}`);
      if (!questionSetResponse.ok) {
        throw new Error('Failed to fetch question set');
      }
      const questionSetData = await questionSetResponse.json();
      setQuestionSet(questionSetData.data);

      // Fetch data records from the source view
      if (questionSetData.data.sourceViewName) {
        const dataResponse = await fetch(
          `/api/database-data?viewName=${encodeURIComponent(questionSetData.data.sourceViewName)}`
        );
        if (!dataResponse.ok) {
          throw new Error('Failed to fetch view data');
        }
        const dataResult = await dataResponse.json();

        // Initialize question configurations based on data records
        initializeQuestionConfigsFromData(dataResult.records || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [questionSetId, initializeQuestionConfigsFromData]);

  useEffect(() => {
    fetchQuestionSetAndData();
  }, [fetchQuestionSetAndData]);

  // Handle scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const tableRect = tableRef.current.getBoundingClientRect();
        const shouldBeSticky = tableRect.top <= 0 && tableRect.bottom > 0;
        setIsHeaderSticky(shouldBeSticky);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateQuestionConfig = (index: number, field: keyof QuestionConfig, value: string | number | boolean) => {
    const newConfigs = questionConfigs.map((config, i) => 
      i === index ? { ...config, [field]: value } : config
    );
    setQuestionConfigs(newConfigs);
    
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null);
    }
  };

  // Define all possible display type options
  const allDisplayTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  // Get available display type options based on field characteristics
  const getDisplayTypeOptions = (config: QuestionConfig) => {
    const hasOptions = config.options && config.options.trim() !== '';
    // Parse field name (remove digits from end) to determine field type
    const fieldNameBase = config.fieldName.replace(/\d+$/, '').toLowerCase();
    const isDateField = fieldNameBase.includes('date') || fieldNameBase === 'date';
    
    if (hasOptions) {
      // Lookup fields: only dropdown and radio buttons
      return allDisplayTypeOptions.filter(option => 
        option.value === 'dropdown' || option.value === 'radio'
      );
    } else if (isDateField) {
      // Date fields: only date type
      return allDisplayTypeOptions.filter(option => option.value === 'date');
    } else {
      // Other fields: exclude dropdown and radio (since they need options)
      return allDisplayTypeOptions.filter(option => 
        option.value !== 'dropdown' && option.value !== 'radio'
      );
    }
  };

  const parseOptions = (optionsJson: string | undefined): string[] => {
    if (!optionsJson || optionsJson.trim() === '') return [];
    
    try {
      const parsed = JSON.parse(optionsJson);
      
      // Handle different possible structures
      if (Array.isArray(parsed)) {
        // Check if it's an array of objects with Text property
        const textValues = parsed
          .filter(item => item && typeof item === 'object' && item.Text)
          .map(item => String(item.Text));
        
        if (textValues.length > 0) {
          return textValues;
        }
        
        // If it's an array of strings, return them directly
        const stringValues = parsed.filter(item => typeof item === 'string');
        return stringValues;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If it's an object, return the values
        const values = Object.values(parsed).filter(value => typeof value === 'string') as string[];
        return values;
      } else if (typeof parsed === 'string') {
        // If it's just a string, return it as a single item array
        return [parsed];
      }
    } catch {
      // Invalid JSON, return empty array
    }
    
    return [];
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    // Clean up visual feedback
    e.currentTarget.classList.remove('border-t-2', 'border-blue-500');
    
    if (draggedIndex === null) return;
    
    if (draggedIndex !== dropIndex) {
      const newConfigs = [...questionConfigs];
      const draggedConfig = newConfigs[draggedIndex];
      
      // Remove dragged item
      newConfigs.splice(draggedIndex, 1);
      
      // Insert at new position
      newConfigs.splice(dropIndex, 0, draggedConfig);
      
      // Update sort orders based on new positions
      const updatedConfigs = newConfigs.map((config, index) => ({
        ...config,
        sortOrder: index + 1
      }));
      
      setQuestionConfigs(updatedConfigs);
    }
    
    setDraggedIndex(null);
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const validateQuestions = (): boolean => {
    const enabledQuestions = questionConfigs.filter(config => config.isEnabled);
    
    if (enabledQuestions.length === 0) {
      setValidationError('At least one question must be enabled to save the question set.');
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate before saving
      if (!validateQuestions()) {
        setSaving(false);
        return;
      }

      // Filter only enabled questions
      const enabledQuestions = questionConfigs.filter(config => config.isEnabled);

      // Create questions for this question set
      const questionsData = enabledQuestions.map(config => ({
        questionSetHeaderId: parseInt(questionSetId),
        fieldName: config.fieldName,
        attributeLabel: config.attributeLabel,
        surveyLabel: config.surveyLabel,
        displayType: config.displayType,
        choices: null, // Options come from data, not user configuration
        description: config.description || null,
        placeholder: config.placeholder || null,
        minValue: config.minValue || null,
        maxValue: config.maxValue || null,
        colCount: config.colCount || null,
        isReadOnly: config.isReadOnly,
        isVisible: config.isVisible,
        isRequired: config.isRequired,
        isBlind: config.isBlind,
        minIsCurrent: config.minIsCurrent,
        sortOrder: config.sortOrder
      }));

      const response = await fetch('/api/questionset-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions: questionsData }),
      });

      if (response.ok) {
        router.push('/questionsets');
      } else {
        const errorData = await response.json();
        alert(`Error saving questions: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving questions:', err);
      alert('Error saving questions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center text-red-600">Error: {error}</div>
        <div className="text-center mt-4">
          <Link href="/questionsets" className="text-blue-600 hover:underline">
            Back to Question Sets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/questionsets" className="hover:text-blue-600">
            Question Sets
          </Link>
          <span>›</span>
          <span className="text-gray-900">{questionSet?.name}</span>
          <span>›</span>
          <span className="text-gray-900">Configure Questions</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Configure Questions</h1>
        <p className="text-gray-600 mt-2">
          Configure how each column from <strong>{questionSet?.sourceViewName}</strong> should appear in the survey
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Question Configuration</h2>
            <div className="flex items-center gap-4">
              <div className={`text-sm font-medium ${
                questionConfigs.filter(q => q.isEnabled).length === 0 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {questionConfigs.filter(q => q.isEnabled).length} of {questionConfigs.length} fields enabled
              </div>
              {questionConfigs.filter(q => q.isEnabled).length === 0 && (
                <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                  At least 1 required
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed header that appears when scrolling */}
        <div 
          className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-transform duration-200 ${
            isHeaderSticky ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="px-6">
            <div className="flex items-center bg-gray-50 border-b border-gray-200 py-3 gap-4">
              <div className="w-8 flex-shrink-0"></div>
              <div className="w-12 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">#</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Attribute Label</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Survey Label</div>
              <div className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Display Type</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Placeholder</div>
              <div className="w-48 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Options</div>
            </div>
          </div>
        </div>

        <div ref={tableRef} className="overflow-x-auto">
          {/* Header row */}
          <div ref={headerRef} className="bg-white">
            <div className="flex items-center bg-gray-50 border-b border-gray-200 py-3 gap-4 px-6">
              <div className="w-8 flex-shrink-0"></div>
              <div className="w-12 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">#</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Attribute Label</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Survey Label</div>
              <div className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Display Type</div>
              <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Placeholder</div>
              <div className="w-48 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider">Options</div>
            </div>
          </div>
          
          {/* Data rows */}
          <div className="bg-white divide-y divide-gray-200">
            {questionConfigs.map((config, index) => {
              const choiceValues = parseOptions(config.options);
              
              return (
                <div key={config.fieldName} className={`${!config.isEnabled ? 'bg-gray-50' : ''} ${draggedIndex === index ? 'opacity-50' : ''}`}>
                  {/* Main row */}
                  <div 
                    className={`flex items-center py-3 gap-4 px-6 hover:bg-gray-50 cursor-move`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                {/* Drag handle */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <div className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                    </svg>
                  </div>
                </div>
                
                {/* Sort order */}
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {config.sortOrder}
                  </div>
                </div>
                
                {/* Field name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded truncate">
                    {config.fieldName}
                  </div>
                </div>
                
                {/* Attribute label */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-600 truncate">
                    {config.attributeLabel}
                  </div>
                </div>
                
                {/* Survey label */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={config.surveyLabel}
                    onChange={(e) => updateQuestionConfig(index, 'surveyLabel', e.target.value)}
                    disabled={!config.isEnabled}
                    className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                      !config.isEnabled ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                  />
                </div>
                
                {/* Display type */}
                <div className="w-32 flex-shrink-0">
                  {(() => {
                    const availableOptions = getDisplayTypeOptions(config);
                    const isOnlyOneOption = availableOptions.length === 1;
                    const shouldDisable = !config.isEnabled || isOnlyOneOption;
                    
                    return (
                      <select
                        value={config.displayType}
                        onChange={(e) => updateQuestionConfig(index, 'displayType', e.target.value)}
                        disabled={shouldDisable}
                        className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                          shouldDisable ? 'bg-gray-100 text-gray-500' : ''
                        }`}
                      >
                        {availableOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
                
                {/* Placeholder */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={config.placeholder || ''}
                    onChange={(e) => updateQuestionConfig(index, 'placeholder', e.target.value)}
                    disabled={!config.isEnabled}
                    className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                      !config.isEnabled ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                  />
                </div>
                
                {/* Options */}
                <div className="w-48 flex-shrink-0">
                  <div className="space-y-2">
                      <button
                        onClick={() => updateQuestionConfig(index, 'isEnabled', !config.isEnabled)}
                        className="flex items-center hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                      >
                        {config.isEnabled ? (
                          <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        Enabled
                      </button>
                      

                      
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.isRequired}
                            onChange={(e) => updateQuestionConfig(index, 'isRequired', e.target.checked)}
                            disabled={!config.isEnabled}
                            className="mr-1 w-3 h-3"
                          />
                          Required
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.isVisible}
                            onChange={(e) => updateQuestionConfig(index, 'isVisible', e.target.checked)}
                            disabled={!config.isEnabled}
                            className="mr-1 w-3 h-3"
                          />
                          Visible
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.isReadOnly}
                            onChange={(e) => updateQuestionConfig(index, 'isReadOnly', e.target.checked)}
                            disabled={!config.isEnabled}
                            className="mr-1 w-3 h-3"
                          />
                          Read Only
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.isBlind}
                            onChange={(e) => updateQuestionConfig(index, 'isBlind', e.target.checked)}
                            disabled={!config.isEnabled}
                            className="mr-1 w-3 h-3"
                          />
                          Blind
                        </label>
                        <label className="flex items-center col-span-2">
                          <input
                            type="checkbox"
                            checked={config.minIsCurrent}
                            onChange={(e) => updateQuestionConfig(index, 'minIsCurrent', e.target.checked)}
                            disabled={!config.isEnabled}
                            className="mr-1 w-3 h-3"
                          />
                          Min Is Current
                        </label>
                      </div>
                    </div>
                  </div>
                  </div>
                  
                  {/* Option pills when options are available */}
                  {choiceValues.length > 0 && (
                    <div className="px-6 pb-3">
                      <div className="ml-20"> {/* Offset to align with content after drag handle and sort order */}
                        <div className="flex flex-wrap gap-1">
                          {choiceValues.map((choice: string, choiceIndex: number) => (
                            <span
                              key={choiceIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {choice}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          

        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/questionsets')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || questionConfigs.filter(q => q.isEnabled).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
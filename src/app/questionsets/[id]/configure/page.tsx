'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import "survey-core/survey-core.min.css";
import { QuestionSetQuestion, QuestionSetHeader } from '@/types/database';


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
  isNewlyAdded?: boolean; // Flag for fields that exist in source but not in saved questions
  isOrphaned?: boolean; // Flag for fields that exist in saved questions but not in source view
}

interface SurveyElement {
  type: string;
  name: string;
  title: string;
  isRequired?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  description?: string;
  inputType?: string;
  min?: number;
  max?: number;
  choices?: Array<{ value: number; text: string }>;
  colCount?: number;
}



export default function ConfigureQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const questionSetId = params.id as string;

  const [questionSet, setQuestionSet] = useState<QuestionSetHeader | null>(null);
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [sourceViewData, setSourceViewData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);





  const createConfigFromSourceRecord = useCallback((record: Record<string, unknown>, index: number): QuestionConfig => {
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
  }, []);

  const mergeQuestionsWithSourceData = useCallback((
    existingQuestions: QuestionSetQuestion[],
    sourceRecords: Record<string, unknown>[]
  ): QuestionConfig[] => {
    const configs: QuestionConfig[] = [];
    const existingFieldNames = new Set(existingQuestions.map(q => q.fieldName));
    
    // Create a set of field names from source records for comparison
    const sourceFieldNames = new Set(
      sourceRecords.map(record => 
        String(record.fieldName || record.FieldName || record.field_name || record.Label || record.label || '')
      ).filter(name => name !== '')
    );
    
    // First, add all existing questions (preserve their configuration)
    existingQuestions.forEach((question) => {
      const isOrphaned = !sourceFieldNames.has(question.fieldName);
      
      // Find matching source record to get current options
      const matchingSourceRecord = sourceRecords.find(record => {
        const sourceFieldName = String(record.fieldName || record.FieldName || record.field_name || record.Label || record.label || '');
        return sourceFieldName === question.fieldName;
      });
      
      // Use options from source view if available, otherwise use saved choices
      const currentOptions = matchingSourceRecord 
        ? String(matchingSourceRecord.options || matchingSourceRecord.Options || '')
        : question.choices || '';
      
      console.log(`Field ${question.fieldName} options:`, {
        fromSourceView: matchingSourceRecord ? String(matchingSourceRecord.options || matchingSourceRecord.Options || '') : 'No match',
        fromDatabase: question.choices || '',
        finalOptions: currentOptions
      });
      
      configs.push({
        fieldName: question.fieldName,
        attributeLabel: question.attributeLabel,
        surveyLabel: question.surveyLabel,
        displayType: question.displayType,
        options: currentOptions,
        description: question.description || '',
        placeholder: question.placeholder || '',
        minValue: question.minValue,
        maxValue: question.maxValue,
        colCount: question.colCount,
        isReadOnly: question.isReadOnly,
        isVisible: question.isVisible,
        isRequired: question.isRequired,
        isBlind: question.isBlind,
        minIsCurrent: question.minIsCurrent,
        sortOrder: question.sortOrder,
        isEnabled: !isOrphaned, // Orphaned questions are disabled by default
        isNewlyAdded: false,
        isOrphaned: isOrphaned
      });
    });

    // Then, add any new fields from source view that don't exist in saved questions
    sourceRecords.forEach((record, index) => {
      const fieldName = String(record.fieldName || record.FieldName || record.field_name || record.Label || record.label || `Field_${index + 1}`);
      
      if (!existingFieldNames.has(fieldName)) {
        const newConfig = createConfigFromSourceRecord(record, configs.length);
        newConfig.isEnabled = false; // New fields are disabled by default
        newConfig.isNewlyAdded = true; // Flag as newly added
        newConfig.isOrphaned = false;
        newConfig.sortOrder = configs.length + 1; // Add at the end
        configs.push(newConfig);
      }
    });

    // Sort by sortOrder, but put orphaned questions at the end
    return configs.sort((a, b) => {
      if (a.isOrphaned && !b.isOrphaned) return 1;
      if (!a.isOrphaned && b.isOrphaned) return -1;
      return a.sortOrder - b.sortOrder;
    });
  }, [createConfigFromSourceRecord]);

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

      let existingQuestions: QuestionSetQuestion[] = [];
      let sourceViewData: Record<string, unknown>[] = [];

      // Fetch existing questions (if any)
      const existingQuestionsResponse = await fetch(`/api/questionset-questions/${questionSetId}`);
      if (existingQuestionsResponse.ok) {
        const existingQuestionsData = await existingQuestionsResponse.json();
        if (existingQuestionsData.data) {
          existingQuestions = existingQuestionsData.data;
        }
      }

      // Fetch current source view data to get all available fields
      if (questionSetData.data.sourceViewName) {
        const dataResponse = await fetch(
          `/api/database-data?viewName=${encodeURIComponent(questionSetData.data.sourceViewName)}`
        );
        if (dataResponse.ok) {
          const dataResult = await dataResponse.json();
          sourceViewData = dataResult.records || [];
          setSourceViewData(sourceViewData); // Store for preview generation
        }
      }

      // Merge existing questions with source view data
      const mergedConfigs = mergeQuestionsWithSourceData(existingQuestions, sourceViewData);
      setQuestionConfigs(mergedConfigs);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [questionSetId, mergeQuestionsWithSourceData]);

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
    // Parse field name (remove digits from end) to determine field type
    const fieldNameBase = config.fieldName.replace(/\d+$/, '').toLowerCase();
    const isDateField = fieldNameBase.includes('date') || fieldNameBase === 'date';
    
    // Date fields should always be restricted to date type only
    if (isDateField) {
      return allDisplayTypeOptions.filter(option => option.value === 'date');
    }
    
    // Check if this field has choices available
    const hasOptions = config.options && config.options.trim() !== '';
    const hasChoicesFromView = getFieldOptionsFromView(config.fieldName).length > 0;
    
    // If field has choices (either from config options or source view), restrict to choice-based types
    if (hasOptions || hasChoicesFromView) {
      return allDisplayTypeOptions.filter(option => 
        option.value === 'dropdown' || option.value === 'radio' || option.value === 'checkbox'
      );
    } else {
      // Other fields without choices: exclude dropdown, radio, and checkbox (since they need options)
      return allDisplayTypeOptions.filter(option => 
        option.value !== 'dropdown' && option.value !== 'radio' && option.value !== 'checkbox'
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

  // Parse options to get proper value-text pairs for SurveyJS
  const parseChoicesForSurvey = useCallback((optionsJson: string | undefined): Array<{ value: string | number; text: string }> => {
    if (!optionsJson || optionsJson.trim() === '') return [];
    
    try {
      const parsed = JSON.parse(optionsJson);
      
      // Handle different possible structures
      if (Array.isArray(parsed)) {
        // Check if it's an array of objects with Text and Value properties (lookup group format)
        const hasProperStructure = parsed.some(item => 
          item && typeof item === 'object' && 'Text' in item
        );
        
        if (hasProperStructure) {
          return parsed
            .filter(item => item && typeof item === 'object' && item.Text)
            .map(item => ({
              value: item.Value !== undefined ? item.Value : item.value !== undefined ? item.value : item.Text,
              text: String(item.Text)
            }));
        }
        
        // If it's an array of strings, create value-text pairs
        const stringValues = parsed.filter(item => typeof item === 'string');
        return stringValues.map((text, index) => ({
          value: index + 1,
          text: text
        }));
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If it's an object, use keys as values and values as text
        return Object.entries(parsed)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => ({
            value: key,
            text: String(value)
          }));
      } else if (typeof parsed === 'string') {
        // If it's just a string, return it as a single choice
        return [{ value: 1, text: parsed }];
      }
    } catch {
      // Invalid JSON, return empty array
    }
    
    return [];
  }, []);

  // Get options from source view data for a specific field
  const getFieldOptionsFromView = useCallback((fieldName: string): Array<{ value: string | number; text: string }> => {
    console.log(`🔍 getFieldOptionsFromView called for field: "${fieldName}"`);
    console.log(`sourceViewData length: ${sourceViewData?.length || 0}`);
    
    if (!sourceViewData || sourceViewData.length === 0) {
      console.log('No source view data available');
      return [];
    }
    
    // First, check if we can find options in the existing question config for this field
    const matchingConfig = questionConfigs.find(config => config.fieldName === fieldName);
    console.log(`🔍 Debug for ${fieldName}:`, matchingConfig);
    console.log(`🔍 matchingConfig.options:`, matchingConfig?.options);
    console.log(`🔍 All properties:`, matchingConfig ? Object.keys(matchingConfig) : 'no config found');
    console.log(`🔍 All values:`, matchingConfig ? Object.values(matchingConfig) : 'no values');
    
    if (matchingConfig && matchingConfig.options && matchingConfig.options.trim() !== '') {
      console.log(`✅ Using options from question config for ${fieldName}:`, matchingConfig.options);
      return parseChoicesForSurvey(matchingConfig.options);
    }
    
    // Log the first few records to see what fields are available
    console.log('First 2 records from source view data:');
    sourceViewData.slice(0, 2).forEach((record, index) => {
      console.log(`Record ${index}:`, record);
      console.log(`Record ${index} Options:`, record.Options);
      console.log(`Record ${index} options:`, record.options);
    });
    
    // Look for a record that has Options defined (fallback for when config doesn't have options)
    for (const record of sourceViewData) {
      // Check if Options exists as an array
      if (record.Options && Array.isArray(record.Options)) {
        console.log(`Found Options array in record:`, record.Options);
        
        const options = (record.Options as Array<Record<string, unknown>>).map((option) => {
          const value = option.value || option.Value || option.id || option.Id;
          const text = option.text || option.Text || option.name || option.Name || String(value);
          
          return {
            value: typeof value === 'string' || typeof value === 'number' ? value : String(value),
            text: String(text)
          };
        });
        
        console.log(`✅ Processed ${options.length} fallback options for ${fieldName}:`, options);
        return options;
      }
      
      // Check lowercase options
      if (record.options && Array.isArray(record.options)) {
        console.log(`Found options array (lowercase) in record:`, record.options);
        
        const options = (record.options as Array<Record<string, unknown>>).map((option) => {
          const value = option.value || option.Value || option.id || option.Id;
          const text = option.text || option.Text || option.name || option.Name || String(value);
          
          return {
            value: typeof value === 'string' || typeof value === 'number' ? value : String(value),
            text: String(text)
          };
        });
        
        console.log(`✅ Processed ${options.length} fallback options (lowercase) for ${fieldName}:`, options);
        return options;
      }
    }
    
    console.log(`❌ No options found for ${fieldName}`);
    return [];
  }, [sourceViewData, questionConfigs, parseChoicesForSurvey]);

  // Convert question configurations to SurveyJS format
  const generateSurveyPreview = useCallback(() => {
    const enabledConfigs = questionConfigs.filter(config => config.isEnabled && config.isVisible && !config.isOrphaned);
    
    if (enabledConfigs.length === 0) {
      return {
        title: questionSet?.name || "Question Set Preview",
        description: "No questions are currently enabled for this question set.",
        pages: []
      };
    }

    const elements = enabledConfigs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(config => {
        const element: SurveyElement = {
          type: config.displayType,
          name: config.fieldName,
          title: config.surveyLabel || config.attributeLabel,
          isRequired: !!config.isRequired
        };

        // Only set readOnly property if it's true (when false, omit the property entirely)
        if (config.isReadOnly) {
          element.readOnly = true;
        }

        // Add placeholder if provided
        if (config.placeholder) {
          element.placeholder = config.placeholder;
        }

        // Add description if provided
        if (config.description) {
          element.description = config.description;
        }

        // Handle different display types
        switch (config.displayType) {
          case 'text':
            element.type = 'text';
            element.inputType = 'text';
            break;
          case 'textarea':
            element.type = 'comment';
            break;
          case 'number':
            element.type = 'text';
            element.inputType = 'number';
            if (config.minValue !== undefined) element.min = config.minValue;
            if (config.maxValue !== undefined) element.max = config.maxValue;
            break;
          case 'date':
            element.type = 'text';
            element.inputType = 'date';
            break;
          case 'dropdown':
          case 'radio':
          case 'checkbox':
            // For dropdown fields, get options from the source view data
            let choices: Array<{ value: string | number; text: string }> = [];
            if (config.displayType === 'dropdown') {
              choices = getFieldOptionsFromView(config.fieldName);
              console.log(`Dropdown field ${config.fieldName}: found ${choices.length} choices`, choices);
              
              // If no choices found, add some debug info to the element
              if (choices.length === 0) {
                console.warn(`No choices found for dropdown field: ${config.fieldName}`);
                console.log('Config object:', config);
                console.log('Source view data sample:', sourceViewData.slice(0, 2));
              }
            } else {
              // For radio/checkbox, use the configured options
              choices = parseChoicesForSurvey(config.options);
            }
            
            if (choices.length > 0) {
              Object.assign(element, { choices });
            } else if (config.displayType === 'dropdown') {
              // For debugging: add a note that choices are missing
              element.description = (element.description || '') + ' [DEBUG: No choices found - check console]';
            }
            
            if (config.displayType === 'dropdown') {
              element.type = 'dropdown';
            } else if (config.displayType === 'radio') {
              element.type = 'radiogroup';
            } else if (config.displayType === 'checkbox') {
              element.type = 'checkbox';
            }
            break;
        }

        // Handle column count for radiogroups
        if (config.colCount && (config.displayType === 'radio' || element.type === 'radiogroup')) {
          element.colCount = config.colCount;
        }

        return element;
      });

    return {
      title: questionSet?.name || "Question Set Preview",
      description: questionSet?.description || "Preview of how this question set will appear in the survey",
      pages: [{
        name: "preview_page",
        elements: elements
      }]
    };
  }, [questionConfigs, questionSet, getFieldOptionsFromView, sourceViewData, parseChoicesForSurvey]);

  // Generate survey JSON for preview
  const previewSurveyJson = generateSurveyPreview();

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
              {questionConfigs.filter(q => q.isNewlyAdded).length > 0 && (
                <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  {questionConfigs.filter(q => q.isNewlyAdded).length} new field{questionConfigs.filter(q => q.isNewlyAdded).length !== 1 ? 's' : ''} available
                </div>
              )}
              {questionConfigs.filter(q => q.isOrphaned).length > 0 && (
                <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                  {questionConfigs.filter(q => q.isOrphaned).length} removed field{questionConfigs.filter(q => q.isOrphaned).length !== 1 ? 's' : ''} (will be deleted)
                </div>
              )}
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
                <div key={config.fieldName} className={`${!config.isEnabled ? 'bg-gray-50' : ''} ${config.isNewlyAdded ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''} ${config.isOrphaned ? 'bg-red-50 border-l-4 border-red-400' : ''} ${draggedIndex === index ? 'opacity-50' : ''}`}>
                  {/* Main row */}
                  <div 
                    className={`flex items-center py-3 gap-4 px-6 hover:bg-gray-50`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                {/* Drag handle */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <div 
                    className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                  >
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
                  <div className={`text-sm font-medium px-2 py-1 rounded truncate flex items-center gap-2 ${
                    config.isNewlyAdded 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : config.isOrphaned 
                        ? 'bg-red-100 text-red-800' 
                        : 'text-gray-900 bg-gray-100'
                  }`}>
                    {config.fieldName}
                    {config.isNewlyAdded && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                        NEW
                      </span>
                    )}
                    {config.isOrphaned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                        REMOVED
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Attribute label */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${
                    config.isOrphaned ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {config.attributeLabel}
                    {config.isOrphaned && (
                      <div className="text-xs text-red-500 italic mt-1">
                        Field no longer exists in source view
                      </div>
                    )}
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
                        onClick={() => !config.isOrphaned && updateQuestionConfig(index, 'isEnabled', !config.isEnabled)}
                        disabled={config.isOrphaned}
                        className={`flex items-center p-1 rounded transition-colors text-xs w-full ${
                          config.isOrphaned 
                            ? 'cursor-not-allowed opacity-50' 
                            : 'hover:bg-gray-100 cursor-pointer'
                        }`}
                        title={config.isOrphaned ? 'Cannot enable - field no longer exists in source view' : ''}
                      >
                        {config.isEnabled ? (
                          <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className={`w-4 h-4 mr-1 ${config.isOrphaned ? 'text-red-400' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        {config.isOrphaned ? 'Will be deleted' : 'Enabled'}
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

      {/* Survey Preview Panel */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Survey Preview</h2>
              <p className="text-sm text-gray-600 mt-1">
                Preview how this question set will appear in the actual survey
              </p>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              {showPreview ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.243 4.243M12 12l3.878 3.878M12 12v6m0-6l3.878-3.878" />
                  </svg>
                  Hide Preview
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Show Preview
                </>
              )}
            </button>
          </div>
        </div>
        
        {showPreview && (
          <div className="p-6">
            {questionConfigs.filter(q => q.isEnabled && q.isVisible && !q.isOrphaned).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No questions are enabled for preview</p>
                <p className="text-xs text-gray-400 mt-1">Enable at least one question to see the survey preview</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="bg-white rounded-md shadow-sm">
                  <Survey 
                    model={new Model(previewSurveyJson)}
                  />
                </div>
                <div className="mt-4 text-xs text-gray-500 text-center">
                  This is a preview only - no data will be saved
                </div>
              </div>
            )}
            
            {/* Debug Panel */}
            <div className="mt-4 border-t pt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {showDebug ? 'Hide Debug JSON' : 'Show Debug JSON'}
              </button>
              
              {showDebug && (
                <div className="mt-3">
                  <div className="bg-gray-900 text-green-400 text-xs font-mono p-4 rounded-lg overflow-auto max-h-96">
                    <pre>{JSON.stringify(previewSurveyJson, null, 2)}</pre>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Source View Records: {sourceViewData.length} | 
                    Enabled Questions: {questionConfigs.filter(q => q.isEnabled && q.isVisible && !q.isOrphaned).length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

/**
 * Configure Questions Page
 * 
 * This page handles configuration of question sets, mapping field types from
 * hms.CustomFieldType to appropriate survey display types.
 * 
 * CustomFieldType Mappings (from hms.CustomFieldType table):
 * - CustomDate (ID: 1) -> date
 * - CustomDateTime (ID: 2) -> date
 * - CustomTime (ID: 3) -> text (or time picker)
 * - CustomInt (ID: 4) -> number
 * - CustomDecimal (ID: 5) -> number
 * - CustomShortText (ID: 6) -> text
 * - CustomLongText (ID: 7) -> textarea
 * - CustomMaxText (ID: 8) -> textarea
 * - CustomBoolean (ID: 9) -> boolean (switch/toggle)
 * - CustomImageLink (ID: 10) -> image
 * 
 * Note: Checkbox is used for multiple-choice fields with options lists
 * 
 * Field naming convention: FieldType + digits (e.g., String01, Date02, Int03)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";
import { QuestionSetQuestion, QuestionSetHeader } from "@/types/database";
import {
  ErrorIcon,
  EyeIcon,
  EyeOffIcon,
  DocumentIcon,
  SettingsIcon,
} from "@/components/icons";

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
  // Boolean-specific labels
  trueLabel?: string;
  falseLabel?: string;
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
  imageLink?: string;
  imageAltText?: string;
  html?: string;
  contentMode?: string;
  imageFit?: string;
  imageHeight?: string | number;
  imageWidth?: string | number;
  acceptedCategories?: string[];
  acceptedTypes?: string;
  allowMultiple?: boolean;
  maxFiles?: number;
  waitForUpload?: boolean;
  allowImagesPreview?: boolean;
  sourceType?: string;
  filePlaceholder?: string;
  photoPlaceholder?: string;
  fileOrPhotoPlaceholder?: string;
  storeDataAsText?: boolean;
  // Boolean question properties
  renderAs?: string;
  labelTrue?: string;
  labelFalse?: string;
  valueTrue?: boolean;
  valueFalse?: boolean;
  defaultValue?: boolean | string | number;
}

const REQUIRED_IMAGE_PLACEHOLDER =
  "https://placehold.co/600x400?text=Image+Required";
const OPTIONAL_IMAGE_PLACEHOLDER =
  "https://placehold.co/600x400?text=Image+Preview";
const PHOTO_CAPTURE_PLACEHOLDER = "Tap to capture photo";

export default function ConfigureQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const questionSetId = params.id as string;

  const [questionSet, setQuestionSet] = useState<QuestionSetHeader | null>(
    null
  );
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [sourceViewData, setSourceViewData] = useState<
    Record<string, unknown>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [floatingHeaderLeft, setFloatingHeaderLeft] = useState(0);
  const [floatingHeaderWidth, setFloatingHeaderWidth] = useState(0);
  const [tableScrollLeft, setTableScrollLeft] = useState(0);

  const tableScrollContainerRef = useRef<HTMLDivElement>(null);
  const tableHeaderRowRef = useRef<HTMLDivElement>(null);
  const tableDataRowsRef = useRef<HTMLDivElement>(null);

  // Map CustomFieldType definitions to display types based on hms.CustomFieldType
  const getDisplayTypeFromFieldName = useCallback((fieldName: string, hasOptions: boolean, fieldNameStartsWithImage: boolean): string => {
    // Extract the field type prefix (e.g., "CustomDate", "CustomInt", etc.)
    const fieldNameBase = fieldName.replace(/\d+$/, "").toLowerCase();
    
    // Image fields (CustomImageLink)
    if (fieldNameStartsWithImage || fieldNameBase.includes("image")) {
      return "image";
    }
    
    // Lookup fields with options
    if (hasOptions || fieldNameBase.includes("lookup")) {
      return "dropdown";
    }
    
    // Date fields (CustomDate, CustomDateTime, CustomTime)
    if (fieldNameBase.includes("date") || fieldNameBase === "date") {
      return "date";
    }
    
    // Time fields (CustomTime)
    if (fieldNameBase.includes("time")) {
      return "text"; // or could be a special time picker
    }
    
    // Numeric fields (CustomInt, CustomDecimal)
    if (fieldNameBase.includes("int") || fieldNameBase.includes("number") || 
        fieldNameBase.includes("decimal") || fieldNameBase.includes("num")) {
      return "number";
    }
    
    // Boolean fields (CustomBoolean) - use boolean/switch type
    if (fieldNameBase.includes("bool") || fieldNameBase.includes("flag")) {
      return "boolean";
    }
    
    // Long text fields (CustomLongText, CustomMaxText)
    if (fieldNameBase.includes("longtext") || fieldNameBase.includes("maxtext") ||
        fieldNameBase.includes("comment") || fieldNameBase.includes("note") ||
        fieldNameBase.includes("description")) {
      return "textarea";
    }
    
    // Short text fields (CustomShortText) or default
    return "text";
  }, []);

  const createConfigFromSourceRecord = useCallback(
    (record: Record<string, unknown>, index: number): QuestionConfig => {
      // Use the 'label' column for attribute label (normalized to camelCase by API)
      const attributeLabel = String(record.label || `Label_${index + 1}`);
      const fieldName = String(record.fieldName || attributeLabel);

      const options = String(record.options || "");
      const hasOptions = options.trim() !== "";
      const fieldNameStartsWithImage = fieldName.trim().toLowerCase().startsWith("image");

      // Infer display type based on CustomFieldType definitions
      const defaultDisplayType = getDisplayTypeFromFieldName(fieldName, hasOptions, fieldNameStartsWithImage);

      // Default boolean labels
      const trueLabel = "Yes";
      const falseLabel = "No";

      return {
        fieldName: fieldName,
        attributeLabel: attributeLabel,
        surveyLabel: attributeLabel,
        displayType: defaultDisplayType,
        options: options, // Get options from the data record
        description: String(record.description || ""),
        placeholder: `Enter ${attributeLabel.toLowerCase()}`,
        isReadOnly: false,
        isVisible: true,
        isRequired: false,
        isBlind: false,
        minIsCurrent: false,
        sortOrder: index + 1,
        isEnabled: true,
        trueLabel: defaultDisplayType === "boolean" ? trueLabel : undefined,
        falseLabel: defaultDisplayType === "boolean" ? falseLabel : undefined,
      };
    },
    [getDisplayTypeFromFieldName]
  );

  const mergeQuestionsWithSourceData = useCallback(
    (
      existingQuestions: QuestionSetQuestion[],
      sourceRecords: Record<string, unknown>[]
    ): QuestionConfig[] => {
      const configs: QuestionConfig[] = [];
      const existingFieldNames = new Set(
        existingQuestions.map((q) => q.fieldName)
      );

      // Create a set of field names from source records for comparison
      const sourceFieldNames = new Set(
        sourceRecords
          .map((record) => String(record.fieldName || record.label || ""))
          .filter((name) => name !== "")
      );

      // First, add all existing questions (preserve their configuration)
      existingQuestions.forEach((question) => {
        const isOrphaned = !sourceFieldNames.has(question.fieldName);

        // Find matching source record to get current options
        const matchingSourceRecord = sourceRecords.find((record) => {
          const sourceFieldName = String(
            record.fieldName ||
              record.FieldName ||
              record.field_name ||
              record.Label ||
              record.label ||
              ""
          );
          return sourceFieldName === question.fieldName;
        });

        // Use options from source view if available, otherwise use saved choices
        const currentOptions = matchingSourceRecord
          ? String(
              matchingSourceRecord.options || matchingSourceRecord.Options || ""
            )
          : question.choices || "";

        console.log(`Field ${question.fieldName} options:`, {
          fromSourceView: matchingSourceRecord
            ? String(
                matchingSourceRecord.options ||
                  matchingSourceRecord.Options ||
                  ""
              )
            : "No match",
          fromDatabase: question.choices || "",
          finalOptions: currentOptions,
        });

        // Parse boolean labels from surveyLabel if displayType is boolean
        // Format: "Question Text|TrueLabel:Yes|FalseLabel:No"
        let trueLabel = "Yes";
        let falseLabel = "No";
        let displayLabel = question.surveyLabel;
        
        if (question.displayType === "boolean" && question.surveyLabel) {
          const parts = question.surveyLabel.split("|");
          if (parts.length >= 3) {
            displayLabel = parts[0];
            const trueLabelMatch = parts.find(p => p.startsWith("TrueLabel:"));
            const falseLabelMatch = parts.find(p => p.startsWith("FalseLabel:"));
            if (trueLabelMatch) trueLabel = trueLabelMatch.substring(10);
            if (falseLabelMatch) falseLabel = falseLabelMatch.substring(11);
          }
        }

        configs.push({
          fieldName: question.fieldName,
          attributeLabel: question.attributeLabel,
          surveyLabel: displayLabel,
          displayType: question.displayType,
          options: currentOptions,
          description: question.description || "",
          placeholder: question.placeholder || "",
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
          isOrphaned: isOrphaned,
          trueLabel: question.displayType === "boolean" ? trueLabel : undefined,
          falseLabel: question.displayType === "boolean" ? falseLabel : undefined,
        });
      });

      // Then, add any new fields from source view that don't exist in saved questions
      sourceRecords.forEach((record, index) => {
        const fieldName = String(
          record.fieldName || record.label || `Field_${index + 1}`
        );

        if (!existingFieldNames.has(fieldName)) {
          const newConfig = createConfigFromSourceRecord(
            record,
            configs.length
          );
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
    },
    [createConfigFromSourceRecord]
  );

  const fetchQuestionSetAndData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch question set details
      const questionSetResponse = await fetch(
        `/api/questionsets/${questionSetId}`
      );
      if (!questionSetResponse.ok) {
        throw new Error("Failed to fetch question set");
      }
      const questionSetData = await questionSetResponse.json();
      setQuestionSet(questionSetData.data);

      let existingQuestions: QuestionSetQuestion[] = [];
      let sourceViewData: Record<string, unknown>[] = [];

      // Fetch existing questions (if any)
      const existingQuestionsResponse = await fetch(
        `/api/questionset-questions/${questionSetId}`
      );
      if (existingQuestionsResponse.ok) {
        const existingQuestionsData = await existingQuestionsResponse.json();
        if (existingQuestionsData.data) {
          existingQuestions = existingQuestionsData.data;
        }
      }

      // Fetch current source view data to get all available fields
      if (questionSetData.data.sourceViewName) {
        const dataResponse = await fetch(
          `/api/database-data?viewName=${encodeURIComponent(
            questionSetData.data.sourceViewName
          )}`
        );
        if (dataResponse.ok) {
          const dataResult = await dataResponse.json();
          sourceViewData = dataResult.records || [];
          setSourceViewData(sourceViewData); // Store for preview generation
        }
      }

      // Merge existing questions with source view data
      const mergedConfigs = mergeQuestionsWithSourceData(
        existingQuestions,
        sourceViewData
      );
      setQuestionConfigs(mergedConfigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [questionSetId, mergeQuestionsWithSourceData]);

  useEffect(() => {
    fetchQuestionSetAndData();
  }, [fetchQuestionSetAndData]);

  useEffect(() => {
    const updateFloatingHeader = () => {
      const container = document.getElementById("question-configuration-container");
      const headerEl = tableHeaderRowRef.current;
      const dataRowsEl = tableDataRowsRef.current;
      if (!container || !headerEl || !dataRowsEl) return;

      const rect = container.getBoundingClientRect();
      const headerRect = headerEl.getBoundingClientRect();
      const dataRowsRect = dataRowsEl.getBoundingClientRect();

      // Show only after the in-table header scrolls off top,
      // and hide once the last data row has scrolled off top.
      const shouldStick = headerRect.bottom <= 0 && dataRowsRect.bottom > 0;

      setShowFloatingHeader(shouldStick);
      setFloatingHeaderLeft(rect.left);
      setFloatingHeaderWidth(rect.width);
      setTableScrollLeft(tableScrollContainerRef.current?.scrollLeft || 0);
    };

    const handleTableScroll = () => {
      setTableScrollLeft(tableScrollContainerRef.current?.scrollLeft || 0);
    };

    const scrollEl = tableScrollContainerRef.current;

    updateFloatingHeader();
    window.addEventListener("scroll", updateFloatingHeader, { passive: true });
    window.addEventListener("resize", updateFloatingHeader);
    scrollEl?.addEventListener("scroll", handleTableScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateFloatingHeader);
      window.removeEventListener("resize", updateFloatingHeader);
      scrollEl?.removeEventListener("scroll", handleTableScroll);
    };
  }, []);

  const updateQuestionConfig = (
    index: number,
    field: keyof QuestionConfig,
    value: string | number | boolean
  ) => {
    const newConfigs = questionConfigs.map((config, i) =>
      i === index ? { ...config, [field]: value } : config
    );
    setQuestionConfigs(newConfigs);

    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null);
    }
  };

  // Define all possible display type options based on hms.CustomFieldType
  const allDisplayTypeOptions = [
    { value: "text", label: "Short Text", fieldTypes: ["CustomShortText", "string", "text", "shorttext"] },
    { value: "textarea", label: "Long Text", fieldTypes: ["CustomLongText", "CustomMaxText", "longtext", "comment", "string"] },
    { value: "number", label: "Number", fieldTypes: ["CustomInt", "CustomDecimal", "int", "decimal", "number"] },
    { value: "date", label: "Date", fieldTypes: ["CustomDate", "CustomDateTime", "date"] },
    { value: "dropdown", label: "Dropdown", fieldTypes: ["lookup", "select"] },
    { value: "radio", label: "Radio Buttons", fieldTypes: ["lookup", "select"] },
    { value: "checkbox", label: "Checkboxes (Multiple Choice)", fieldTypes: ["lookup", "select"] },
    { value: "boolean", label: "Boolean (Yes/No Switch)", fieldTypes: ["CustomBoolean", "bool"] },
    { value: "image", label: "Image", fieldTypes: ["CustomImageLink", "image"] },
  ];

  // Get available display type options based on field characteristics and CustomFieldType
  const getDisplayTypeOptions = (config: QuestionConfig) => {
    // Parse field name (remove digits from end) to determine field type
    const fieldNameBase = config.fieldName.replace(/\d+$/, "").toLowerCase();
    const isDateField = fieldNameBase.includes("date") || fieldNameBase === "date";
    const isTimeField = fieldNameBase.includes("time");
    const isIntField = fieldNameBase.includes("int") || fieldNameBase.includes("number");
    const isDecimalField = fieldNameBase.includes("decimal");
    const isBoolField = fieldNameBase.includes("bool") || fieldNameBase.includes("check");
    const isLongTextField = fieldNameBase.includes("longtext") || fieldNameBase.includes("maxtext");
    const isShortTextField = fieldNameBase.includes("shorttext") || fieldNameBase.includes("string");
    const fieldNameStartsWithImage = config.fieldName.trim().toLowerCase().startsWith("image");

    // Date/Time fields should be restricted to date type only
    if (isDateField || isTimeField) {
      return allDisplayTypeOptions.filter((option) => option.value === "date");
    }

    // Numeric fields (int/decimal)
    if (isIntField || isDecimalField) {
      return allDisplayTypeOptions.filter((option) => option.value === "number");
    }

    // Boolean fields (true/false switch)
    if (isBoolField) {
      return allDisplayTypeOptions.filter((option) => option.value === "boolean");
    }

    // Check if this field has choices available (lookup fields)
    const hasOptions = config.options && config.options.trim() !== "";
    const hasChoicesFromView = getFieldOptionsFromView(config.fieldName).length > 0;

    // If field has choices (either from config options or source view), restrict to choice-based types
    let filteredOptions;
    if (hasOptions || hasChoicesFromView) {
      filteredOptions = allDisplayTypeOptions.filter(
        (option) =>
          option.value === "dropdown" ||
          option.value === "radio" ||
          option.value === "checkbox"  // Checkbox for multiple selection from options
      );
    } else {
      // Text fields without choices - allow both short and long text for string fields
      if (isLongTextField) {
        // For explicitly long text fields, allow both options but prefer textarea
        filteredOptions = allDisplayTypeOptions.filter(
          (option) => option.value === "text" || option.value === "textarea"
        );
      } else if (isShortTextField) {
        // For string fields, allow both short text and long text options
        filteredOptions = allDisplayTypeOptions.filter(
          (option) => option.value === "text" || option.value === "textarea"
        );
      } else {
        // Other fields without choices: exclude dropdown, radio, and checkbox (since they need options)
        filteredOptions = allDisplayTypeOptions.filter(
          (option) =>
            option.value !== "dropdown" &&
            option.value !== "radio" &&
            option.value !== "checkbox"
        );
      }
    }

    if (!fieldNameStartsWithImage) {
      filteredOptions = filteredOptions.filter(
        (option) => option.value !== "image"
      );
    } else if (!filteredOptions.some((option) => option.value === "image")) {
      const imageOption = allDisplayTypeOptions.find(
        (option) => option.value === "image"
      );
      if (imageOption) {
        filteredOptions = [...filteredOptions, imageOption];
      }
    }

    return filteredOptions;
  };

  const parseOptions = (optionsJson: string | undefined): string[] => {
    if (!optionsJson || optionsJson.trim() === "") return [];

    try {
      const parsed = JSON.parse(optionsJson);

      // Handle different possible structures
      if (Array.isArray(parsed)) {
        // Check if it's an array of objects with Text property
        const textValues = parsed
          .filter((item) => item && typeof item === "object" && item.Text)
          .map((item) => String(item.Text));

        if (textValues.length > 0) {
          return textValues;
        }

        // If it's an array of strings, return them directly
        const stringValues = parsed.filter((item) => typeof item === "string");
        return stringValues;
      } else if (typeof parsed === "object" && parsed !== null) {
        // If it's an object, return the values
        const values = Object.values(parsed).filter(
          (value) => typeof value === "string"
        ) as string[];
        return values;
      } else if (typeof parsed === "string") {
        // If it's just a string, return it as a single item array
        return [parsed];
      }
    } catch {
      // Invalid JSON, return empty array
    }

    return [];
  };

  // Parse options to get proper value-text pairs for SurveyJS
  const parseChoicesForSurvey = useCallback(
    (
      optionsJson: string | undefined
    ): Array<{ value: string | number; text: string }> => {
      if (!optionsJson || optionsJson.trim() === "") return [];

      try {
        const parsed = JSON.parse(optionsJson);

        // Handle different possible structures
        if (Array.isArray(parsed)) {
          // Check if it's an array of objects with Text and Value properties (lookup group format)
          const hasProperStructure = parsed.some(
            (item) => item && typeof item === "object" && "Text" in item
          );

          if (hasProperStructure) {
            return parsed
              .filter((item) => item && typeof item === "object" && item.Text)
              .map((item) => ({
                value:
                  item.Value !== undefined
                    ? item.Value
                    : item.value !== undefined
                    ? item.value
                    : item.Text,
                text: String(item.Text),
              }));
          }

          // If it's an array of strings, create value-text pairs
          const stringValues = parsed.filter(
            (item) => typeof item === "string"
          );
          return stringValues.map((text, index) => ({
            value: index + 1,
            text: text,
          }));
        } else if (typeof parsed === "object" && parsed !== null) {
          // If it's an object, use keys as values and values as text
          return Object.entries(parsed)
            .filter(([, value]) => typeof value === "string")
            .map(([key, value]) => ({
              value: key,
              text: String(value),
            }));
        } else if (typeof parsed === "string") {
          // If it's just a string, return it as a single choice
          return [{ value: 1, text: parsed }];
        }
      } catch {
        // Invalid JSON, return empty array
      }

      return [];
    },
    []
  );

  // Get options from source view data for a specific field
  const getFieldOptionsFromView = useCallback(
    (fieldName: string): Array<{ value: string | number; text: string }> => {
      console.log(
        `🔍 getFieldOptionsFromView called for field: "${fieldName}"`
      );
      console.log(`sourceViewData length: ${sourceViewData?.length || 0}`);

      if (!sourceViewData || sourceViewData.length === 0) {
        console.log("No source view data available");
        return [];
      }

      // First, check if we can find options in the existing question config for this field
      const matchingConfig = questionConfigs.find(
        (config) => config.fieldName === fieldName
      );
      console.log(`🔍 Debug for ${fieldName}:`, matchingConfig);
      console.log(`🔍 matchingConfig.options:`, matchingConfig?.options);
      console.log(
        `🔍 All properties:`,
        matchingConfig ? Object.keys(matchingConfig) : "no config found"
      );
      console.log(
        `🔍 All values:`,
        matchingConfig ? Object.values(matchingConfig) : "no values"
      );

      if (
        matchingConfig &&
        matchingConfig.options &&
        matchingConfig.options.trim() !== ""
      ) {
        console.log(
          `✅ Using options from question config for ${fieldName}:`,
          matchingConfig.options
        );
        return parseChoicesForSurvey(matchingConfig.options);
      }

      // Log the first few records to see what fields are available
      console.log("First 2 records from source view data:");
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

          const options = (
            record.Options as Array<Record<string, unknown>>
          ).map((option) => {
            const value =
              option.value || option.Value || option.id || option.Id;
            const text =
              option.text ||
              option.Text ||
              option.name ||
              option.Name ||
              String(value);

            return {
              value:
                typeof value === "string" || typeof value === "number"
                  ? value
                  : String(value),
              text: String(text),
            };
          });

          console.log(
            `✅ Processed ${options.length} fallback options for ${fieldName}:`,
            options
          );
          return options;
        }

        // Check lowercase options
        if (record.options && Array.isArray(record.options)) {
          console.log(
            `Found options array (lowercase) in record:`,
            record.options
          );

          const options = (
            record.options as Array<Record<string, unknown>>
          ).map((option) => {
            const value =
              option.value || option.Value || option.id || option.Id;
            const text =
              option.text ||
              option.Text ||
              option.name ||
              option.Name ||
              String(value);

            return {
              value:
                typeof value === "string" || typeof value === "number"
                  ? value
                  : String(value),
              text: String(text),
            };
          });

          console.log(
            `✅ Processed ${options.length} fallback options (lowercase) for ${fieldName}:`,
            options
          );
          return options;
        }
      }

      console.log(`❌ No options found for ${fieldName}`);
      return [];
    },
    [sourceViewData, questionConfigs, parseChoicesForSurvey]
  );

  const getImagePreviewSource = useCallback(
    (fieldName: string): string => {
      if (!sourceViewData || sourceViewData.length === 0) {
        return "";
      }

      for (const record of sourceViewData) {
        const value = record[fieldName];
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed !== "") {
            return trimmed;
          }
        }
      }

      return "";
    },
    [sourceViewData]
  );

  const toHttpUrlOrEmpty = (value?: string): string => {
    if (!value) return "";
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : "";
  };

  // Convert question configurations to SurveyJS format
  const generateSurveyPreview = useCallback(() => {
    const enabledConfigs = questionConfigs.filter(
      (config) => config.isEnabled && config.isVisible && !config.isOrphaned
    );

    if (enabledConfigs.length === 0) {
      return {
        title: questionSet?.name || "Question Set Preview",
        description:
          "No questions are currently enabled for this question set.",
        pages: [],
      };
    }

    const elements = enabledConfigs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((config) => {
        const element: SurveyElement = {
          type: config.displayType,
          name: config.fieldName,
          title: config.surveyLabel || config.attributeLabel,
          isRequired: !!config.isRequired,
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
          case "text":
            element.type = "text";
            element.inputType = "text";
            break;
          case "textarea":
            element.type = "comment";
            break;
          case "number":
            element.type = "text";
            element.inputType = "number";
            if (config.minValue !== undefined) element.min = config.minValue;
            if (config.maxValue !== undefined) element.max = config.maxValue;
            break;
          case "date":
            element.type = "text";
            element.inputType = "date";
            break;
          case "boolean":
            // SurveyJS boolean type with switch rendering
            element.type = "boolean";
            element.renderAs = "switch";
            // Set the labels that appear next to the switch
            element.labelTrue = config.trueLabel || "Yes";
            element.labelFalse = config.falseLabel || "No";
            // Set the actual values stored
            element.valueTrue = true;
            element.valueFalse = false;
            // Default to true for preview to show toggle in "on" state
            element.defaultValue = true;
            break;
          case "dropdown":
          case "radio":
          case "checkbox":
            // For dropdown fields, get options from the source view data
            let choices: Array<{ value: string | number; text: string }> = [];
            if (config.displayType === "dropdown") {
              choices = getFieldOptionsFromView(config.fieldName);
              console.log(
                `Dropdown field ${config.fieldName}: found ${choices.length} choices`,
                choices
              );

              // If no choices found, add some debug info to the element
              if (choices.length === 0) {
                console.warn(
                  `No choices found for dropdown field: ${config.fieldName}`
                );
                console.log("Config object:", config);
                console.log(
                  "Source view data sample:",
                  sourceViewData.slice(0, 2)
                );
              }
            } else {
              // For radio/checkbox, use the configured options
              choices = parseChoicesForSurvey(config.options);
            }

            if (choices.length > 0) {
              Object.assign(element, { choices });
            } else if (config.displayType === "dropdown") {
              // For debugging: add a note that choices are missing
              element.description =
                (element.description || "") +
                " [DEBUG: No choices found - check console]";
            }

            if (config.displayType === "dropdown") {
              element.type = "dropdown";
            } else if (config.displayType === "radio") {
              element.type = "radiogroup";
            } else if (config.displayType === "checkbox") {
              element.type = "checkbox";
            }
            break;
          case "image": {
            const capturePlaceholder =
              config.placeholder ||
              `${PHOTO_CAPTURE_PLACEHOLDER} for ${
                config.surveyLabel || config.attributeLabel || config.fieldName
              }`;

            if (config.isReadOnly) {
              const imageFromData = getImagePreviewSource(config.fieldName);
              const placeholderAsUrl = toHttpUrlOrEmpty(config.placeholder);
              const preferredImage = imageFromData || placeholderAsUrl;
              const fallbackImage = config.isRequired
                ? REQUIRED_IMAGE_PLACEHOLDER
                : OPTIONAL_IMAGE_PLACEHOLDER;
              const imageLink = preferredImage || fallbackImage;

              element.type = "image";
              element.imageLink = imageLink;
              element.imageAltText =
                config.surveyLabel || config.attributeLabel || config.fieldName;
              element.contentMode = "image";
              element.imageFit = "contain";
              element.imageHeight = "240px";
              element.imageWidth = "100%";
            } else {
              element.type = "file";
              element.acceptedCategories = ["image"];
              element.acceptedTypes = "image/*";
              element.allowMultiple = false;
              element.maxFiles = 1;
              element.allowImagesPreview = true;
              element.sourceType = "camera";
              element.waitForUpload = true;
              element.fileOrPhotoPlaceholder = capturePlaceholder;
              element.photoPlaceholder = capturePlaceholder;
              element.storeDataAsText = false;
            }
            break;
          }
        }

        // Handle column count for radiogroups
        if (
          config.colCount &&
          (config.displayType === "radio" || element.type === "radiogroup")
        ) {
          element.colCount = config.colCount;
        }

        return element;
      });

    return {
      title: questionSet?.name || "Question Set Preview",
      description:
        questionSet?.description ||
        "Preview of how this question set will appear in the survey",
      pages: [
        {
          name: "preview_page",
          elements: elements,
        },
      ],
    };
  }, [
    questionConfigs,
    questionSet,
    getFieldOptionsFromView,
    sourceViewData,
    parseChoicesForSurvey,
    getImagePreviewSource,
  ]);

  // Generate survey JSON for preview
  const previewSurveyJson = generateSurveyPreview();

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = "1";
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Add visual feedback for drop target
    e.currentTarget.classList.add("border-t-2", "border-blue-500");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("border-t-2", "border-blue-500");
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    e.preventDefault();

    // Clean up visual feedback
    e.currentTarget.classList.remove("border-t-2", "border-blue-500");

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
        sortOrder: index + 1,
      }));

      setQuestionConfigs(updatedConfigs);
    }

    setDraggedIndex(null);
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const validateQuestions = (): boolean => {
    const enabledQuestions = questionConfigs.filter(
      (config) => config.isEnabled
    );

    if (enabledQuestions.length === 0) {
      setValidationError(
        "At least one question must be enabled to save the question set."
      );
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
      const enabledQuestions = questionConfigs.filter(
        (config) => config.isEnabled
      );

      // Create questions for this question set
      const questionsData = enabledQuestions.map((config) => {
        // For boolean questions, encode the true/false labels into surveyLabel
        let surveyLabelToSave = config.surveyLabel;
        if (config.displayType === "boolean" && (config.trueLabel || config.falseLabel)) {
          const trueLabel = config.trueLabel || "Yes";
          const falseLabel = config.falseLabel || "No";
          surveyLabelToSave = `${config.surveyLabel}|TrueLabel:${trueLabel}|FalseLabel:${falseLabel}`;
        }

        return {
          questionSetHeaderId: parseInt(questionSetId),
          fieldName: config.fieldName,
          attributeLabel: config.attributeLabel,
          surveyLabel: surveyLabelToSave,
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
          sortOrder: config.sortOrder,
        };
      });

      const response = await fetch("/api/questionset-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions: questionsData }),
      });

      if (response.ok) {
        router.push("/questionsets");
      } else {
        const errorData = await response.json();
        alert(`Error saving questions: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error saving questions:", err);
      alert("Error saving questions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-red-600 text-center">Error: {error}</div>
        <div className="mt-4 text-center">
          <Link href="/questionsets" className="text-blue-600 hover:underline">
            Back to Question Sets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-6xl">
      {showFloatingHeader && (
        <div
          className="top-0 z-50 fixed bg-white shadow-sm border-gray-200 border-x border-b overflow-hidden"
          style={{ left: floatingHeaderLeft, width: floatingHeaderWidth }}
        >
          <div
            className="flex items-center gap-4 bg-gray-50 pr-6 pl-12 py-3"
            style={{ transform: `translateX(${-tableScrollLeft}px)` }}
          >
            <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
              Field Name
            </div>
            <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
              Attribute Label
            </div>
            <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
              Survey Label
            </div>
            <div className="flex-shrink-0 w-32 font-medium text-gray-500 text-xs uppercase tracking-wider">
              Display Type
            </div>
            <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
              Placeholder
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm">
          <Link href="/questionsets" className="hover:text-blue-600">
            Question Sets
          </Link>
          <span>›</span>
          <span className="text-gray-900">{questionSet?.name}</span>
          <span>›</span>
          <span className="text-gray-900">Configure Questions</span>
        </div>
        <h1 className="font-bold text-gray-900 text-3xl">
          Configure Questions
        </h1>
        <p className="mt-2 text-gray-600">
          Configure how each column from{" "}
          <strong>{questionSet?.sourceViewName}</strong> should appear in the
          survey
        </p>
      </div>

      <div
        id="question-configuration-container"
        className="bg-white shadow-sm border border-gray-200 rounded-lg"
      >
        <div className="p-6 border-gray-200 border-b">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Question Configuration</h2>
            <div className="flex items-center gap-4">
              <div
                className={`text-sm font-medium ${
                  questionConfigs.filter((q) => q.isEnabled).length === 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {questionConfigs.filter((q) => q.isEnabled).length} of{" "}
                {questionConfigs.length} fields enabled
              </div>
              {questionConfigs.filter((q) => q.isNewlyAdded).length > 0 && (
                <div className="bg-yellow-100 px-2 py-1 rounded text-yellow-700 text-xs">
                  {questionConfigs.filter((q) => q.isNewlyAdded).length} new
                  field
                  {questionConfigs.filter((q) => q.isNewlyAdded).length !== 1
                    ? "s"
                    : ""}{" "}
                  available
                </div>
              )}
              {questionConfigs.filter((q) => q.isOrphaned).length > 0 && (
                <div className="bg-red-100 px-2 py-1 rounded text-red-700 text-xs">
                  {questionConfigs.filter((q) => q.isOrphaned).length} removed
                  field
                  {questionConfigs.filter((q) => q.isOrphaned).length !== 1
                    ? "s"
                    : ""}{" "}
                  (will be deleted)
                </div>
              )}
              {questionConfigs.filter((q) => q.isEnabled).length === 0 && (
                <div className="bg-red-50 px-2 py-1 rounded text-red-500 text-xs">
                  At least 1 required
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={tableScrollContainerRef}
          className="overflow-x-auto overflow-y-visible"
        >
          {/* Header row */}
          <div className="bg-white shadow-sm">
            <div
              ref={tableHeaderRowRef}
              className="flex items-center gap-4 bg-gray-50 pr-6 pl-12 py-3 border-gray-200 border-b"
            >
              <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Field Name
              </div>
              <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Attribute Label
              </div>
              <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Survey Label
              </div>
              <div className="flex-shrink-0 w-32 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Display Type
              </div>
              <div className="flex-1 min-w-0 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Placeholder
              </div>
            </div>
          </div>

          {/* Data rows */}
          <div ref={tableDataRowsRef} className="bg-white divide-y divide-gray-200">
            {questionConfigs.map((config, index) => {
              const choiceValues = parseOptions(config.options);

              return (
                <div
                  key={config.fieldName}
                  className={`relative ${!config.isEnabled ? "bg-gray-50" : ""} ${
                    config.isNewlyAdded
                      ? "bg-yellow-50 border-l-4 border-yellow-400"
                      : ""
                  } ${
                    config.isOrphaned
                      ? "bg-red-50 border-l-4 border-red-400"
                      : ""
                  } ${draggedIndex === index ? "opacity-50" : ""}`}
                >
                  {/* Main row */}
                  <div
                    className={`flex items-center py-3 gap-4 pr-6 pl-12 hover:bg-gray-50`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {/* Drag handle */}
                    <div
                      className="top-2 left-2 absolute flex justify-center items-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </div>

                    {/* Field name */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium px-2 py-1 rounded truncate flex items-center gap-2 ${
                          config.isNewlyAdded
                            ? "bg-yellow-100 text-yellow-800"
                            : config.isOrphaned
                            ? "bg-red-100 text-red-800"
                            : "text-gray-900 bg-gray-100"
                        }`}
                      >
                        {config.fieldName}
                        {config.isNewlyAdded && (
                          <span className="inline-flex items-center bg-yellow-200 px-2 py-0.5 rounded-full font-medium text-yellow-800 text-xs">
                            NEW
                          </span>
                        )}
                        {config.isOrphaned && (
                          <span className="inline-flex items-center bg-red-200 px-2 py-0.5 rounded-full font-medium text-red-800 text-xs">
                            REMOVED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attribute label */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${
                          config.isOrphaned ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {config.attributeLabel}
                        {config.isOrphaned && (
                          <div className="mt-1 text-red-500 text-xs italic">
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
                        onChange={(e) =>
                          updateQuestionConfig(
                            index,
                            "surveyLabel",
                            e.target.value
                          )
                        }
                        disabled={!config.isEnabled}
                        className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                          !config.isEnabled ? "bg-gray-100 text-gray-500" : ""
                        }`}
                      />
                    </div>

                    {/* Display type */}
                    <div className="flex-shrink-0 w-32">
                      {(() => {
                        const availableOptions = getDisplayTypeOptions(config);
                        const isOnlyOneOption = availableOptions.length === 1;
                        const shouldDisable =
                          !config.isEnabled || isOnlyOneOption;

                        return (
                          <select
                            value={config.displayType}
                            onChange={(e) =>
                              updateQuestionConfig(
                                index,
                                "displayType",
                                e.target.value
                              )
                            }
                            disabled={shouldDisable}
                            className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                              shouldDisable ? "bg-gray-100 text-gray-500" : ""
                            }`}
                          >
                            {availableOptions.map((option) => (
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
                      {config.displayType === "boolean" ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={config.trueLabel || "Yes"}
                            onChange={(e) =>
                              updateQuestionConfig(
                                index,
                                "trueLabel",
                                e.target.value
                              )
                            }
                            disabled={!config.isEnabled}
                            placeholder="True label"
                            className={`w-1/2 px-2 py-1 text-sm border border-gray-300 rounded ${
                              !config.isEnabled ? "bg-gray-100 text-gray-500" : ""
                            }`}
                          />
                          <input
                            type="text"
                            value={config.falseLabel || "No"}
                            onChange={(e) =>
                              updateQuestionConfig(
                                index,
                                "falseLabel",
                                e.target.value
                              )
                            }
                            disabled={!config.isEnabled}
                            placeholder="False label"
                            className={`w-1/2 px-2 py-1 text-sm border border-gray-300 rounded ${
                              !config.isEnabled ? "bg-gray-100 text-gray-500" : ""
                            }`}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={config.placeholder || ""}
                          onChange={(e) =>
                            updateQuestionConfig(
                              index,
                              "placeholder",
                              e.target.value
                            )
                          }
                          disabled={!config.isEnabled}
                          className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                            !config.isEnabled ? "bg-gray-100 text-gray-500" : ""
                          }`}
                        />
                      )}
                    </div>

                  </div>

                  {/* Row 2: Options and toggles */}
                  <div className="px-6 pb-3">
                    <div className="text-xs">
                      {choiceValues.length > 0 && (
                        <div className="pb-2">
                          <div
                            className="grid gap-1"
                            style={{
                              gridTemplateColumns: `repeat(${Math.max(
                                choiceValues.length,
                                1
                              )}, minmax(0, 1fr))`,
                            }}
                          >
                            {choiceValues.map(
                              (choice: string, choiceIndex: number) => (
                                <span
                                  key={choiceIndex}
                                  className="inline-flex items-center justify-center bg-blue-100 px-2 py-1 rounded-full w-full min-h-7 font-medium text-blue-800 text-xs text-center"
                                  title={choice}
                                >
                                  {choice}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="gap-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 pt-2 border-gray-100 border-t">
                        <button
                          onClick={() =>
                            !config.isOrphaned &&
                            updateQuestionConfig(index, "isEnabled", !config.isEnabled)
                          }
                          disabled={config.isOrphaned}
                          className={`flex items-center justify-start px-2 py-1 rounded border border-gray-200 transition-colors text-left ${
                            config.isOrphaned
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-gray-100 cursor-pointer"
                          }`}
                          title={
                            config.isOrphaned
                              ? "Cannot enable - field no longer exists in source view"
                              : ""
                        }
                        >
                          {config.isEnabled ? (
                            <svg
                              className="mr-1 w-4 h-4 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className={`w-4 h-4 mr-1 ${
                                config.isOrphaned ? "text-red-400" : "text-red-600"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {config.isOrphaned ? "Will be deleted" : "Enabled"}
                        </button>

                        <label className="flex items-center justify-start gap-1 px-2 py-1 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={config.isRequired}
                            onChange={(e) =>
                              updateQuestionConfig(index, "isRequired", e.target.checked)
                            }
                            disabled={!config.isEnabled}
                            className="w-3 h-3"
                          />
                          Required
                        </label>
                        <label className="flex items-center justify-start gap-1 px-2 py-1 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={config.isVisible}
                            onChange={(e) =>
                              updateQuestionConfig(index, "isVisible", e.target.checked)
                            }
                            disabled={!config.isEnabled}
                            className="w-3 h-3"
                          />
                          Visible
                        </label>
                        <label className="flex items-center justify-start gap-1 px-2 py-1 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={config.isReadOnly}
                            onChange={(e) =>
                              updateQuestionConfig(index, "isReadOnly", e.target.checked)
                            }
                            disabled={!config.isEnabled}
                            className="w-3 h-3"
                          />
                          Read Only
                        </label>
                        <label className="flex items-center justify-start gap-1 px-2 py-1 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={config.isBlind}
                            onChange={(e) =>
                              updateQuestionConfig(index, "isBlind", e.target.checked)
                            }
                            disabled={!config.isEnabled}
                            className="w-3 h-3"
                          />
                          Blind
                        </label>
                        <label className="flex items-center justify-start gap-1 px-2 py-1 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={config.minIsCurrent}
                            onChange={(e) =>
                              updateQuestionConfig(index, "minIsCurrent", e.target.checked)
                            }
                            disabled={!config.isEnabled}
                            className="w-3 h-3"
                          />
                          Min Is Current
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-50 p-6 border-gray-200 border-t">
          {validationError && (
            <div className="bg-red-50 mb-4 p-3 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ErrorIcon className="mr-2 w-5 h-5 text-red-400" />
                <p className="text-red-700 text-sm">{validationError}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/questionsets")}
              className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                questionConfigs.filter((q) => q.isEnabled).length === 0
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 border border-transparent rounded-md font-medium text-white text-sm disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Questions"}
            </button>
          </div>
        </div>
      </div>

      {/* Survey Preview Panel */}
      <div className="bg-white shadow-sm mt-6 border border-gray-200 rounded-lg">
        <div className="p-6 border-gray-200 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">Survey Preview</h2>
              <p className="mt-1 text-gray-600 text-sm">
                Preview how this question set will appear in the actual survey
              </p>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 border border-gray-300 rounded-md font-medium text-gray-700 text-sm"
            >
              {showPreview ? (
                <>
                  <EyeOffIcon />
                  Hide Preview
                </>
              ) : (
                <>
                  <EyeIcon />
                  Show Preview
                </>
              )}
            </button>
          </div>
        </div>

        {showPreview && (
          <div className="p-6">
            {questionConfigs.filter(
              (q) => q.isEnabled && q.isVisible && !q.isOrphaned
            ).length === 0 ? (
              <div className="py-8 text-gray-500 text-center">
                <DocumentIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p className="text-sm">No questions are enabled for preview</p>
                <p className="mt-1 text-gray-400 text-xs">
                  Enable at least one question to see the survey preview
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="bg-white shadow-sm rounded-md">
                  <Survey
                    model={(() => {
                      const model = new Model(previewSurveyJson);
                      model.applyTheme(LayeredLight);
                      return model;
                    })()}
                  />
                </div>
                <div className="mt-4 text-gray-500 text-xs text-center">
                  This is a preview only - no data will be saved
                </div>
              </div>
            )}

            {/* Debug Panel */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 border border-gray-300 rounded-md font-medium text-gray-700 text-sm"
              >
                <SettingsIcon />
                {showDebug ? "Hide Debug JSON" : "Show Debug JSON"}
              </button>

              {showDebug && (
                <div className="mt-3">
                  <div className="bg-gray-900 p-4 rounded-lg max-h-96 overflow-auto font-mono text-green-400 text-xs">
                    <pre>{JSON.stringify(previewSurveyJson, null, 2)}</pre>
                  </div>
                  <div className="mt-2 text-gray-600 text-xs">
                    Source View Records: {sourceViewData.length} | Enabled
                    Questions:{" "}
                    {
                      questionConfigs.filter(
                        (q) => q.isEnabled && q.isVisible && !q.isOrphaned
                      ).length
                    }
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

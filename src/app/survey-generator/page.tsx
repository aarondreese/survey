"use client";

import { useState, useEffect, useRef } from "react";
import HomeButton from "@/components/HomeButton";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";
import type { SurveyTemplateHeader } from "@/types/surveys";
import type { Address } from "@/types/database";

interface SurveyJsonState {
  survey: {
    pages: unknown[];
    surveyMeta?: {
      generatedAt: string;
      templateId: number;
      assetId: number;
      possibleQuestionSets: PossibleQuestionSetMetadata[];
    };
  };
  data: Record<string, unknown>;
}

interface PossibleQuestionMetadata {
  generatedName: string;
  originalName: string;
  fieldName: string;
  title: string;
  type: string;
  isReadOnly: boolean;
  isRequired: boolean;
  choices: Array<{ value: unknown; text: string }>;
  answer: {
    currentValue: unknown;
    defaultValue: unknown;
  };
}

interface PossibleQuestionSetMetadata {
  key: string;
  title: string;
  sourcePageId: number;
  sourcePageName: string;
  sourcePanelName: string | null;
  sourcePageSplitIdentifier: string | null;
  sourceTypeId: number | null;
  sourceInstanceId: number | null;
  sourceAttributeId: number | null;
  questions: PossibleQuestionMetadata[];
}

interface TemplateQuestionSetQuestion {
  fieldName: string;
  attributeLabel?: string;
  surveyLabel?: string;
  displayType?: string;
  choices?: string;
  isRequired?: boolean;
}

interface TemplateQuestionSetItem {
  questionType: "QuestionSet";
  questionSetHeaderId: number;
  questionSetHeader?: {
    id: number;
    name?: string;
    sourceViewName?: string;
  };
  questions?: TemplateQuestionSetQuestion[];
}

export default function ScratchPage() {
  const [templates, setTemplates] = useState<SurveyTemplateHeader[]>([]);
  const [templateId, setTemplateId] = useState<number>(0);
  const [assetId, setAssetId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [surveyJson, setSurveyJson] = useState<SurveyJsonState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [surveyInstanceId, setSurveyInstanceId] = useState<number | null>(null);
  const [addressSearch, setAddressSearch] = useState<string>("");
  const [addressResults, setAddressResults] = useState<Address[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] =
    useState<boolean>(false);
  const [searchingAddress, setSearchingAddress] = useState<boolean>(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);
  const surveyModelRef = useRef<Model | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addressDropdownRef.current &&
        !addressDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const response: Response = await fetch("/api/surveys");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const result = await response.json();
      // Extract data from wrapped response
      const data = result.data || result;
      // Ensure data is always an array
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    }
  };

  const searchAddresses = async (query: string) => {
    if (query.trim().length < 2) {
      setAddressResults([]);
      setShowAddressDropdown(false);
      return;
    }

    try {
      setSearchingAddress(true);
      const response: Response = await fetch(
        `/api/address-search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("Failed to search addresses");

      const result = await response.json();
      setAddressResults(result.data || []);
      setShowAddressDropdown(true);
    } catch {
      setAddressResults([]);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleAddressSelect = (address: Address) => {
    if (address.PropertyID) {
      setAssetId(address.PropertyID);
      const fullAddress = [
        address.AddressLine1,
        address.AddressLine2,
        address.Town,
        address.PostCode,
      ]
        .filter(Boolean)
        .join(", ");
      setAddressSearch(fullAddress);
      setShowAddressDropdown(false);
    }
  };

  const sanitizeFieldName = (value: unknown): string => {
    const raw = String(value ?? "field")
      .trim()
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return raw.length > 0 ? raw : "field";
  };

  const mapDisplayTypeToSurveyType = (displayType?: string): string => {
    const normalized = String(displayType || "").toLowerCase();

    if (normalized.includes("date")) return "date";
    if (normalized.includes("bool")) return "radiogroup";
    if (normalized.includes("check")) return "checkbox";
    if (normalized.includes("radio")) return "radiogroup";
    if (
      normalized.includes("dropdown") ||
      normalized.includes("select") ||
      normalized.includes("lookup")
    ) {
      return "dropdown";
    }
    if (normalized.includes("image")) return "file";

    return "text";
  };

  const isChoiceType = (surveyType: string): boolean => {
    return ["dropdown", "checkbox", "radiogroup", "tagbox"].includes(
      surveyType,
    );
  };

  const parseTemplateChoices = (
    choices?: string,
  ): Array<{ value: unknown; text: string }> => {
    if (!choices || choices.trim().length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(choices) as unknown;

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") {
              return { value: item, text: item };
            }
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              const value =
                obj.value ?? obj.Value ?? obj.id ?? obj.Id ?? obj.text ?? obj.Text;
              const text = String(
                obj.text ?? obj.Text ?? obj.label ?? obj.Label ?? value ?? "",
              );
              return { value, text };
            }
            return null;
          })
          .filter(
            (item): item is { value: unknown; text: string } => Boolean(item),
          );
      }
    } catch {
      // Fallback to delimited text parsing.
    }

    return choices
      .split(/[|,;\n]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => ({ value, text: value }));
  };

  const parseSourceOptions = (
    rawOptions: unknown,
  ): Array<{ value: unknown; text: string }> => {
    if (rawOptions === null || rawOptions === undefined) {
      return [];
    }

    const toChoice = (
      item: unknown,
    ): { value: unknown; text: string } | null => {
      if (typeof item === "string") {
        return { value: item, text: item };
      }
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const value =
          obj.value ?? obj.Value ?? obj.id ?? obj.Id ?? obj.key ?? obj.Key;
        const textCandidate =
          obj.text ??
          obj.Text ??
          obj.label ??
          obj.Label ??
          obj.name ??
          obj.Name ??
          value;
        return { value, text: String(textCandidate ?? "") };
      }
      return null;
    };

    if (Array.isArray(rawOptions)) {
      return rawOptions
        .map(toChoice)
        .filter(
          (item): item is { value: unknown; text: string } => Boolean(item),
        );
    }

    if (typeof rawOptions === "string") {
      const trimmed = rawOptions.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .map(toChoice)
            .filter(
              (item): item is { value: unknown; text: string } => Boolean(item),
            );
        }
      } catch {
        // Continue with delimited text fallback.
      }

      return trimmed
        .split(/[|,;\n]/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => ({ value, text: value }));
    }

    if (typeof rawOptions === "object" && rawOptions !== null) {
      const obj = rawOptions as Record<string, unknown>;
      const nested = obj.options ?? obj.choices;
      if (Array.isArray(nested)) {
        return nested
          .map(toChoice)
          .filter(
            (item): item is { value: unknown; text: string } => Boolean(item),
          );
      }
    }

    return [];
  };

  const extractTypeId = (
    page: {
      ParsedJSON: any;
      PageSplitIdentifier: string | null;
    },
    pageData: any,
  ): number | null => {
    const candidates = [
      pageData?.typeID,
      pageData?.typeId,
      pageData?.instanceTypeID,
      pageData?.instanceTypeId,
      pageData?.attributeTypeID,
      pageData?.attributeTypeId,
      page?.ParsedJSON?.typeID,
      page?.ParsedJSON?.typeId,
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const idFromIdentifier = Number(page.PageSplitIdentifier);
    if (!Number.isNaN(idFromIdentifier)) {
      return idFromIdentifier;
    }

    return null;
  };

  // Helper function to process individual elements
  const processElement = (
    element: any,
    instanceId: any,
    rawPageId: number,
    surveyData: Record<string, any>,
    assetIdValue: number,
    attributeId: any,
  ) => {
    // Make element name unique.
    const originalName = element.name;
    element.originalName = originalName;
    // If this element is for a meta-generated question-set and includes attributeTypeID,
    // and there is no instance yet, use the attributeTypeID naming convention so
    // the field is addressable by attribute type across instances.
    if (
      (element.attributeTypeID !== undefined && element.attributeTypeID !== null) &&
      (instanceId === undefined || instanceId === null)
    ) {
      const suffix = String(element.fieldName || originalName || rawPageId).replace(/\s+/g, "_");
      element.name = `attributeTypeID_${String(element.attributeTypeID)}_${suffix}`;
    } else if (instanceId !== undefined && instanceId !== null) {
      element.name = `instance_${instanceId}_${originalName}`;
    } else {
      element.name = `page_${rawPageId}_${originalName}`;
    }

    // Add metadata to element for later export
    element.assetId = assetIdValue;
    element.instanceId = instanceId;
    element.attributeId = attributeId || element.attributeId;

    // Parse choices if it's a string
    let choices = element.choices;
    if (typeof choices === "string") {
      try {
        choices = JSON.parse(choices);
        element.choices = choices; // Update the element with parsed choices
      } catch {
        choices = null;
      }
    }

    // Verify choices structure
    if (choices && Array.isArray(choices)) {
      // Normalize choices but preserve any additional properties (e.g., meta-contents)
      element.choices = choices.map((choice: any) => {
        if (choice && typeof choice === "object") {
          const v = choice.value !== undefined ? choice.value : choice.Value;
          const t = choice.text !== undefined ? choice.text : choice.Text;
          return { ...choice, value: v, text: t };
        }
        // Primitive value (number/string) -> convert to object
        return { value: choice, text: String(choice) };
      });

      // Update the local choices variable to use normalized version
      choices = element.choices;
    }

    // Determine the value to use: currentValue takes precedence, then defaultValue
    const valueToUse =
      element.currentValue !== undefined && element.currentValue !== null
        ? element.currentValue
        : element.defaultValue;

    // Set initial value based on currentValue or defaultValue
    if (valueToUse !== undefined && valueToUse !== null) {
      if (choices && Array.isArray(choices)) {
        const matchedChoice = choices.find((choice: any) => {
          // Convert both to strings for comparison
          return String(choice.value) === String(valueToUse);
        });

        if (matchedChoice) {
          // Store the matched choice value (use the actual choice.value, not the string)
          surveyData[element.name] = matchedChoice.value;

          // Set defaultValue if isBlind is not true
          // Use the matched choice value to ensure type consistency
          if (element.isBlind !== true) {
            element.defaultValue = matchedChoice.value;
          }
        } else {
          // Try to convert to number if it looks like a number
          const numValue = Number(valueToUse);
          surveyData[element.name] = !isNaN(numValue) ? numValue : valueToUse;
        }
      } else {
        // No choices, just use the value directly
        surveyData[element.name] = valueToUse;

        // Set defaultValue if isBlind is not true (for text fields, etc.)
        // Skip for image types as they handle values differently
        if (element.isBlind !== true && element.type !== "image") {
          element.defaultValue = valueToUse;
        }
      }
    }

    // Handle image fields - convert to camera capture if editable
    if (element.type === "image") {
      const isReadOnly = element.readOnly === true;

      if (isReadOnly) {
        // Read-only: keep as image type, ensure imageLink is set
        if (!element.imageLink && element.currentValue) {
          element.imageLink = element.currentValue;
        }
        element.contentMode = "image";
      } else {
        // Editable: convert to file type with camera capture
        element.type = "file";
        // Show both camera and file options
        element.sourceType = "file-camera";
        element.acceptedTypes = "image/*";
        element.storeDataAsText = true;
        element.allowImagesPreview = true;
        element.maxSize = 10485760; // 10MB max file size
        element.needConfirmRemoveFile = false;
        element.waitForUpload = true;
        element.allowMultiple = false;

        element.photoPlaceholder = "Tap to capture photo";
        element.filePlaceholder = "Choose file or take photo";
        element.imageWidth = "600px";
        element.imageHeight = "400px";

        // If there's an existing image, set it as initial value in surveyData
        const imageData = element.currentValue || element.imageLink;
        if (imageData && imageData.trim() !== "") {
          const formattedImage = imageData.startsWith("data:")
            ? imageData
            : `data:image/jpeg;base64,${imageData}`;

          // Check if we have actual image data (not just the header)
          const hasActualData =
            formattedImage.length > "data:image/jpeg;base64,".length + 10;

          if (hasActualData) {
            // Only set in surveyData if we have a valid image with content
            surveyData[element.name] = [
              {
                name: "existing-image.jpg",
                type: "image/jpeg",
                content: formattedImage,
              },
            ];
          }
        } else {
          // No existing image - showing upload buttons
        }

        delete element.imageLink;
        delete element.contentMode;
        delete element.currentValue; // Remove currentValue since we've moved it to surveyData
      }
    }

    // DON'T delete currentValue or defaultValue - preserve them for future use
    // Only clean up page-level properties that shouldn't be on elements
    delete element.instance;
    delete element.pageSplit;
    delete element.pageSplitIdentifier;

    return element;
  };

  const handleSaveSurvey = async () => {
    if (!surveyJson || !templateId || !assetId) {
      setError("No survey to save");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current data from the survey model (includes user changes and images)
      const currentData = surveyModelRef.current?.data || surveyJson.data || {};

      // Combine survey structure with current data
      const surveyToSave = {
        ...surveyJson.survey,
        data: currentData,
      };

      // Debug: check for meta-contents presence before saving
      try {
        const containsMeta =
          JSON.stringify(surveyToSave).includes("meta-contents");
        console.log(
          "handleSaveSurvey - surveyToSave contains meta-contents?",
          containsMeta,
        );
        if (containsMeta)
          console.log(
            "handleSaveSurvey - excerpt:",
            JSON.stringify(surveyToSave).substring(0, 1000),
          );
      } catch {
        console.warn(
          "handleSaveSurvey - failed to inspect surveyToSave for meta-contents",
        );
      }

      const jsonString = JSON.stringify(surveyToSave);

      // Chunk size: 50KB to be safe (well under 64KB limit)
      const CHUNK_SIZE = 50000;
      const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);

      let surveyInstanceIdResult: number | null = null;

      // Send chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, jsonString.length);
        const chunk = jsonString.substring(start, end);

        const response: Response = await fetch("/api/survey-instance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surveyTemplateHeaderId: templateId,
            entityReference: `Asset_${assetId}`,
            surveyInstanceId: surveyInstanceIdResult, // null for first chunk
            chunk: chunk,
            chunkIndex: i,
            totalChunks: totalChunks,
            isLastChunk: i === totalChunks - 1,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save chunk ${i + 1}`);
        }

        const result = await response.json();

        // Store the ID from first chunk
        if (i === 0 && result.surveyInstanceId) {
          surveyInstanceIdResult = result.surveyInstanceId;
        }
      }

      if (surveyInstanceIdResult) {
        setSurveyInstanceId(surveyInstanceIdResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save survey");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!templateId || !assetId) {
      setError("Please select a template and enter an asset ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSurveyJson(null);
      setSurveyInstanceId(null);

      const response: Response = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, assetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate survey");
      }

      const data = await response.json();

      let templateQuestionSets: TemplateQuestionSetItem[] = [];
      try {
        const templateQuestionsResponse = await fetch(
          `/api/surveys/${templateId}/questions`,
        );
        if (templateQuestionsResponse.ok) {
          const templateQuestionsResult = await templateQuestionsResponse.json();
          const templateItems = Array.isArray(templateQuestionsResult?.data)
            ? templateQuestionsResult.data
            : [];

          templateQuestionSets = templateItems.filter(
            (item: any): item is TemplateQuestionSetItem =>
              item?.questionType === "QuestionSet" &&
              typeof item?.questionSetHeaderId === "number",
          );
        }
      } catch {
        // Non-blocking: generated-derived possible sets will be used as fallback.
      }

      const sourceViewRecordsByName: Record<
        string,
        Record<string, unknown>[]
      > = {};
      const uniqueSourceViews = Array.from(
        new Set(
          templateQuestionSets
            .map((item) => item.questionSetHeader?.sourceViewName)
            .filter((name): name is string => Boolean(name && name.trim())),
        ),
      );

      if (uniqueSourceViews.length > 0) {
        await Promise.all(
          uniqueSourceViews.map(async (viewName) => {
            try {
              const sourceViewResponse = await fetch(
                `/api/database-data?viewName=${encodeURIComponent(viewName)}`,
              );

              if (!sourceViewResponse.ok) {
                sourceViewRecordsByName[viewName] = [];
                return;
              }

              const sourceViewResult = await sourceViewResponse.json();
              sourceViewRecordsByName[viewName] = Array.isArray(
                sourceViewResult?.records,
              )
                ? sourceViewResult.records
                : [];
            } catch {
              sourceViewRecordsByName[viewName] = [];
            }
          }),
        );
      }

      // Build survey data object to hold all current values
      const surveyData: Record<string, any> = {};
      const possibleQuestionSets: PossibleQuestionSetMetadata[] = [];

      // Parse all pages from API and normalise different JSON shapes
      const parsedPages = data.pages
        .map(
          (page: {
            ID: number;
            JSONText: string;
            ParsedJSON: any;
            PageSplit: boolean;
            PageSplitIdentifier: string | null;
            InstanceID: number | null;
            AttributeID: number | null;
          }) => {
            if (!page.ParsedJSON) {
              return null;
            }

            // Normalise cases where the stored proc returns an array of question objects
            // (e.g. [{ type: 'Dropdown', name: 'Primary Heat Source', ... }]) instead of a page wrapper
            let parsedJSON = page.ParsedJSON;
            if (Array.isArray(parsedJSON) && parsedJSON.length > 0) {
              const first = parsedJSON[0];
              if (first && typeof first === "object") {
                // If first element looks like a question (has 'type'), wrap as page.elements
                if ("type" in first && !("elements" in first)) {
                  parsedJSON = { elements: parsedJSON };
                } else {
                  // It's likely a page-wrapped array (FOR JSON may return [ { title, elements } ])
                  parsedJSON = parsedJSON[0];
                }
              }
            }

            const pageData = Array.isArray(parsedJSON)
              ? parsedJSON[0]
              : parsedJSON;

            // Extract instance and attributeId - prefer API level, fallback to ParsedJSON
            const instanceId = page.InstanceID ?? pageData.instance;
            const attributeId = page.AttributeID ?? pageData.attributeId;
            const typeId = attributeId ?? extractTypeId(page, pageData);
            const pageSplit = page.PageSplit;
            const pageSplitIdentifier = page.PageSplitIdentifier;

            return {
              rawPageId: page.ID,
              pageData,
              typeId,
              instanceId,
              attributeId,
              pageSplit,
              pageSplitIdentifier,
            };
          },
        )
        .filter((p: any) => p !== null);

      // Group pages by pageSplitIdentifier
      const pageGroups = new Map<string | null, any[]>();

      parsedPages.forEach((p: any) => {
        // Normalize the identifier - treat empty string, null, undefined as null
        let identifier = p.pageSplitIdentifier;
        if (!identifier || identifier.trim() === "") {
          identifier = null;
        }

        if (!pageGroups.has(identifier)) {
          pageGroups.set(identifier, []);
        }
        pageGroups.get(identifier)!.push(p);
      });

      // Build Survey.js pages structure
      const surveyPages: any[] = [];

      pageGroups.forEach((group, identifier) => {
        if (identifier) {
          // Has identifier - create one page with the identifier as the page name/title
          // Each data row becomes a separate section (panel) on this page
          const surveyPage: any = {
            name: `page_${assetId}_${identifier}`,
            title: identifier,
            elements: [],
          };

          group.forEach((p: any) => {
            const pageData = p.pageData;
            const typeId = p.typeId;
            const instanceId = p.instanceId;
            const attributeId = p.attributeId;

            // Create a panel (section) for this question set
            const panel: any = {
              type: "panel",
              name: `panel_${assetId}_${instanceId}`,
              title: pageData.title || pageData.name || "Section",
              elements: [],
            };

            // Process elements
            if (pageData.elements) {
              const processedElements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData,
                  assetId,
                  attributeId,
                );
              });

              panel.elements = processedElements;

              possibleQuestionSets.push({
                key: `possible_${p.rawPageId}_${instanceId ?? "none"}_${attributeId ?? "none"}`,
                title: pageData.title || pageData.name || identifier,
                sourcePageId: p.rawPageId,
                sourcePageName: surveyPage.name,
                sourcePanelName: panel.name,
                sourcePageSplitIdentifier: identifier,
                sourceTypeId: typeId ?? null,
                sourceInstanceId: instanceId ?? null,
                sourceAttributeId: attributeId ?? null,
                questions: processedElements.map((element: any) => ({
                  generatedName: String(element.name || ""),
                  originalName: String(element.originalName || element.name || ""),
                  fieldName: String(
                    element.fieldName || element.originalName || element.name || "",
                  ),
                  title: String(
                    element.title || element.label || element.name || "Untitled question",
                  ),
                  type: String(element.type || "text"),
                  isReadOnly: element.readOnly === true,
                  isRequired: element.isRequired === true,
                  choices: Array.isArray(element.choices)
                    ? element.choices.map((choice: any) => ({
                        value: choice?.value,
                        text: String(choice?.text ?? choice?.value ?? ""),
                      }))
                    : [],
                  answer: {
                    currentValue: element.currentValue ?? null,
                    defaultValue: element.defaultValue ?? null,
                  },
                })),
              });
            }

            surveyPage.elements.push(panel);
          });

          surveyPages.push(surveyPage);
        } else {
          // No identifier - each gets its own page
          group.forEach((p: any) => {
            const pageData = p.pageData;
            const typeId = p.typeId;
            const instanceId = p.instanceId;
            const attributeId = p.attributeId;

            const surveyPage: any = {
              name:
                instanceId !== undefined && instanceId !== null
                  ? `page_${assetId}_instance_${instanceId}`
                  : `page_${assetId}_${p.rawPageId}`,
              title: pageData.title || pageData.name || "Page",
              elements: [],
            };

            // Add instance info as description if exists
            if (instanceId !== undefined && instanceId !== null) {
              surveyPage.description = `Instance ID: ${instanceId}`;
            }

            // Process elements
            if (pageData.elements) {
              const processedElements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData,
                  assetId,
                  attributeId,
                );
              });

              surveyPage.elements = processedElements;

              possibleQuestionSets.push({
                key: `possible_${p.rawPageId}_${instanceId ?? "none"}_${attributeId ?? "none"}`,
                title: pageData.title || pageData.name || "Page",
                sourcePageId: p.rawPageId,
                sourcePageName: surveyPage.name,
                sourcePanelName: null,
                sourcePageSplitIdentifier: identifier,
                sourceTypeId: typeId ?? null,
                sourceInstanceId: instanceId ?? null,
                sourceAttributeId: attributeId ?? null,
                questions: processedElements.map((element: any) => ({
                  generatedName: String(element.name || ""),
                  originalName: String(element.originalName || element.name || ""),
                  fieldName: String(
                    element.fieldName || element.originalName || element.name || "",
                  ),
                  title: String(
                    element.title || element.label || element.name || "Untitled question",
                  ),
                  type: String(element.type || "text"),
                  isReadOnly: element.readOnly === true,
                  isRequired: element.isRequired === true,
                  choices: Array.isArray(element.choices)
                    ? element.choices.map((choice: any) => ({
                        value: choice?.value,
                        text: String(choice?.text ?? choice?.value ?? ""),
                      }))
                    : [],
                  answer: {
                    currentValue: element.currentValue ?? null,
                    defaultValue: element.defaultValue ?? null,
                  },
                })),
              });
            }

            surveyPages.push(surveyPage);
          });
        }
      });

      const generatedChoicesByTypeAndField = new Map<
        string,
        Array<{ value: unknown; text: string }>
      >();

      const sourceViewChoicesByTypeAndField = new Map<
        string,
        Array<{ value: unknown; text: string }>
      >();

      for (const templateSet of templateQuestionSets) {
        const questionSetId = templateSet.questionSetHeaderId;
        const sourceViewName = templateSet.questionSetHeader?.sourceViewName;
        if (!sourceViewName) continue;

        const viewRecords = sourceViewRecordsByName[sourceViewName] || [];
        const templateQuestions = Array.isArray(templateSet.questions)
          ? templateSet.questions
          : [];

        for (const templateQuestion of templateQuestions) {
          const fieldName = sanitizeFieldName(templateQuestion.fieldName || "");
          if (!fieldName) continue;

          const matchingRecord = viewRecords.find((record) => {
            const recordFieldName = sanitizeFieldName(
              String(record.fieldName ?? record.FieldName ?? record.label ?? ""),
            );
            return recordFieldName.toLowerCase() === fieldName.toLowerCase();
          });

          if (!matchingRecord) continue;

          const options =
            matchingRecord.options ??
            matchingRecord.Options ??
            matchingRecord.choices ??
            matchingRecord.Choices;

          const parsedOptions = parseSourceOptions(options);
          if (parsedOptions.length > 0) {
            sourceViewChoicesByTypeAndField.set(
              `${questionSetId}::${fieldName}`,
              parsedOptions,
            );
          }
        }
      }

      for (const generatedSet of possibleQuestionSets) {
        const typeToken = String(
          generatedSet.sourceTypeId ?? generatedSet.sourceAttributeId ?? "",
        );

        for (const generatedQuestion of generatedSet.questions) {
          const fieldToken = sanitizeFieldName(
            generatedQuestion.fieldName ||
              generatedQuestion.originalName ||
              generatedQuestion.generatedName,
          );
          const key = `${typeToken}::${fieldToken}`;

          if (
            Array.isArray(generatedQuestion.choices) &&
            generatedQuestion.choices.length > 0 &&
            !generatedChoicesByTypeAndField.has(key)
          ) {
            generatedChoicesByTypeAndField.set(key, generatedQuestion.choices);
          }
        }
      }

      const possibleQuestionSetsFromTemplate =
        templateQuestionSets.length > 0
          ? templateQuestionSets.map((item) => {
              const questionSetId = item.questionSetHeaderId;
              const questionSetQuestions = Array.isArray(item.questions)
                ? item.questions
                : [];

              return {
                key: `template_qs_${questionSetId}`,
                title:
                  item.questionSetHeader?.name || `Question Set ${questionSetId}`,
                sourcePageId: 0,
                sourcePageName: `template_questionset_${questionSetId}`,
                sourcePanelName: null,
                sourcePageSplitIdentifier: null,
                sourceTypeId: questionSetId,
                sourceInstanceId: null,
                sourceAttributeId: questionSetId,
                questions: questionSetQuestions.map((question, index) => {
                  const fieldName = sanitizeFieldName(
                    question.fieldName || `field_${index + 1}`,
                  );
                  const surveyType = mapDisplayTypeToSurveyType(
                    question.displayType,
                  );
                  const templateChoices = parseTemplateChoices(question.choices);
                  const sourceViewChoices = sourceViewChoicesByTypeAndField.get(
                    `${questionSetId}::${fieldName}`,
                  );
                  const generatedChoices = generatedChoicesByTypeAndField.get(
                    `${questionSetId}::${fieldName}`,
                  );

                  let resolvedChoices: Array<{ value: unknown; text: string }> =
                    [];

                  if (
                    Array.isArray(sourceViewChoices) &&
                    sourceViewChoices.length > 0
                  ) {
                    resolvedChoices = sourceViewChoices;
                  }

                  if (
                    (!resolvedChoices || resolvedChoices.length === 0) &&
                    Array.isArray(generatedChoices) &&
                    generatedChoices.length > 0
                  ) {
                    resolvedChoices = generatedChoices;
                  }

                  if (
                    (!resolvedChoices || resolvedChoices.length === 0) &&
                    Array.isArray(templateChoices) &&
                    templateChoices.length > 0
                  ) {
                    resolvedChoices = templateChoices;
                  }

                  if (
                    (surveyType === "radiogroup" || surveyType === "checkbox") &&
                    (!resolvedChoices || resolvedChoices.length === 0)
                  ) {
                    resolvedChoices = [
                      { value: true, text: "Yes" },
                      { value: false, text: "No" },
                    ];
                  }

                  return {
                    generatedName: `type_${questionSetId}_instance_na_${fieldName}`,
                    originalName: fieldName,
                    fieldName,
                    title:
                      question.surveyLabel ||
                      question.attributeLabel ||
                      question.fieldName ||
                      `Question ${index + 1}`,
                    type: surveyType,
                    isReadOnly: false,
                    isRequired: question.isRequired === true,
                    choices: isChoiceType(surveyType) ? resolvedChoices : [],
                    answer: {
                      currentValue: null,
                      defaultValue: null,
                    },
                  };
                }),
              } as PossibleQuestionSetMetadata;
            })
          : possibleQuestionSets;

      const fullSurvey = {
        pages: surveyPages,
        surveyMeta: {
          generatedAt: new Date().toISOString(),
          templateId,
          assetId,
          possibleQuestionSets: possibleQuestionSetsFromTemplate,
        },
      };

      setSurveyJson({ survey: fullSurvey, data: surveyData });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <style jsx global>{`
        /* Constrain images within question content - very aggressive */
        .sd-element__content.sd-question__content img,
        .sd-file__decorator img,
        .sd-file__preview img,
        .sd-question__content img,
        .sd-file img,
        .sv_q_file_preview img,
        div[class*="sd-file"] img,
        div[class*="preview"] img {
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
          display: block !important;
        }

        .sd-file__preview-wrapper,
        .sd-file__preview,
        .sd-file__decorator,
        .sv_q_file_preview,
        div[class*="sd-file__preview"] {
          max-width: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        /* Force file question container to constrain content */
        .sd-file,
        .sd-question--file {
          max-width: 100% !important;
          overflow: hidden !important;
        }

        /* Force camera button to be visible on all devices (including desktop) */
        .sd-file__choose-btn--camera,
        .sd-context-btn--camera,
        .sd-file__decorator .sd-context-btn,
        .sd-action-bar .sd-action-bar-item,
        .sv-action-bar .sv-action-bar-item {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* Make camera button visible in the file decorator */
        .sd-file__decorator {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 10px !important;
        }

        /* Ensure all action buttons in file questions are visible */
        .sd-file .sd-action-bar,
        .sd-file .sv-action-bar,
        .sd-file__choose-file {
          display: flex !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
          body {
            padding: 0 !important;
          }

          .p-8 {
            padding: 0.5rem !important;
          }

          /* Survey container adjustments for mobile */
          .sd-root-modern {
            padding: 0.5rem !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .sd-page {
            padding: 0.5rem !important;
            max-width: 100% !important;
          }

          .sd-question {
            padding: 0.5rem !important;
            max-width: 100% !important;
          }

          .sd-body {
            padding: 0 !important;
            max-width: 100% !important;
          }

          /* Ensure file upload buttons are visible on mobile */
          .sd-file__decorator,
          .sd-file__choose-btn,
          .sd-file__choose-btn--camera,
          .sd-file__btn,
          .sd-file__sign-pad,
          .sd-context-btn,
          .sv-action-bar-item {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            position: relative !important;
          }

          /* Make camera button more prominent */
          .sd-file__choose-btn--camera,
          .sd-context-btn--camera {
            min-width: 120px !important;
            min-height: 44px !important;
            font-size: 16px !important;
            padding: 12px 20px !important;
            margin: 10px !important;
          }

          /* Make sure file input area is tappable */
          .sd-file {
            min-height: 120px !important;
            width: 100% !important;
          }

          .sd-file__decorator {
            width: 100% !important;
            min-height: 100px !important;
          }

          /* Reverse button order - camera first, then file */
          .sd-file__decorator,
          .sd-file__choose-file,
          .sd-action-bar,
          .sv-action-bar {
            display: flex !important;
            flex-direction: row-reverse !important;
            justify-content: center !important;
            gap: 10px !important;
          }
        }

        /* Fix Survey.js navigation buttons to stay in place */
        .sd-footer {
          display: grid !important;
          grid-template-columns: auto 1fr auto !important;
          grid-template-rows: auto auto !important;
          gap: 1rem !important;
          width: 100% !important;
        }

        /* Reset any default margins */
        .sd-footer .sd-btn {
          margin: 0 !important;
        }

        /* Previous button ALWAYS Row 1, Column 1 (left) */
        .sd-navigation__prev-btn {
          grid-column: 1 !important;
          grid-row: 1 !important;
        }

        /* Next button ALWAYS Row 1, Column 3 (right) */
        .sd-navigation__next-btn {
          grid-column: 3 !important;
          grid-row: 1 !important;
        }

        /* Complete button ALWAYS Row 2, spans all columns, full width */
        .sd-navigation__complete-btn {
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          width: 100% !important;
        }
      `}</style>

      <HomeButton />

      <div className="mb-6">
        <h1 className="font-bold text-3xl">Generate New Survey</h1>
        <p className="mt-1 text-gray-600">
          Generate a survey by selecting a template and entering an asset ID
        </p>
      </div>

      {error && (
        <div className="bg-red-100 mb-4 p-4 border border-red-400 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white shadow-md mb-6 p-6 rounded-lg">
        {/* Address Search */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700 text-sm">
            Search by Address
          </label>
          <div className="relative" ref={addressDropdownRef}>
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => {
                setAddressSearch(e.target.value);
                searchAddresses(e.target.value);
              }}
              onFocus={() => {
                if (addressResults.length > 0) setShowAddressDropdown(true);
              }}
              placeholder="Type address, postcode, or town..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
            {searchingAddress && (
              <div className="top-3 right-3 absolute">
                <div className="border-2 border-gray-300 border-t-blue-600 rounded-full w-4 h-4 animate-spin"></div>
              </div>
            )}

            {/* Address Dropdown */}
            {showAddressDropdown && addressResults.length > 0 && (
              <div className="z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md w-full max-h-60 overflow-y-auto">
                {addressResults.map((address) => (
                  <button
                    key={address.AddressID}
                    onClick={() => handleAddressSelect(address)}
                    className="block hover:bg-blue-50 p-3 border-gray-200 border-b last:border-b-0 w-full text-left"
                  >
                    <div className="font-medium text-gray-900">
                      {address.AddressLine1}
                      {address.AddressLine2 && `, ${address.AddressLine2}`}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {address.Town}, {address.County} {address.PostCode}
                    </div>
                    {address.PropertyID && (
                      <div className="mt-1 text-blue-600 text-xs">
                        Property ID: {address.PropertyID}
                      </div>
                    )}
                    {!address.PropertyID && (
                      <div className="mt-1 text-gray-500 text-xs italic">
                        No property linked
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {addressResults.length === 0 &&
            addressSearch.length >= 2 &&
            !searchingAddress && (
              <p className="mt-1 text-gray-500 text-xs">No addresses found</p>
            )}
        </div>

        {/* Template and Asset ID Row */}
        <div className="items-end gap-4 grid grid-cols-1 md:grid-cols-3">
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Survey Template
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="0">-- Select Template --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  [{template.id}] {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Asset ID (Property ID)
            </label>
            <input
              type="number"
              value={assetId || ""}
              onChange={(e) => setAssetId(parseInt(e.target.value) || 0)}
              placeholder="Enter asset/property ID"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 px-4 py-2 rounded-md w-full text-white disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Survey"}
            </button>
          </div>
        </div>

        {/* Save Survey Button */}
        {surveyJson && !surveyInstanceId && (
          <div className="mt-4">
            <button
              onClick={handleSaveSurvey}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-6 py-3 rounded-md w-full font-semibold text-white disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Survey"}
            </button>
          </div>
        )}
      </div>

      {/* Survey Preview */}
      {surveyJson && (
        <>
          {/* Survey Instance ID Display */}
          {surveyInstanceId && (
            <div className="bg-green-100 mb-4 p-4 border border-green-400 rounded text-green-700">
              <div className="flex justify-between items-center">
                <div>
                  <strong>✓ Survey Saved Successfully!</strong>
                  <div className="mt-1">
                    Survey Instance ID:{" "}
                    <span className="font-mono font-bold">
                      {surveyInstanceId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved Survey Warning */}
          {!surveyInstanceId && (
            <div className="bg-yellow-100 mb-4 p-4 border border-yellow-400 rounded text-yellow-700">
              <strong>⚠ Survey Not Saved</strong>
              <div className="mt-1">
                Click the &quot;Save Survey&quot; button above to create a
                survey instance.
              </div>
            </div>
          )}

          <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Survey Renderer */}
            <div className="bg-white shadow-md p-6 rounded-lg">
              <h2 className="mb-4 font-semibold text-xl">Survey Preview</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div
                  className="bg-white shadow-sm rounded-md overflow-y-auto"
                  style={{ height: "calc(100vh - 400px)" }}
                >
                  <Survey
                    model={(() => {
                      const model = new Model(surveyJson.survey);
                      model.showCompletedPage = false;
                      model.applyTheme(LayeredLight);

                      // Store model reference
                      surveyModelRef.current = model;

                      // Enable Table of Contents on the right - COMMENTED OUT
                      model.showTOC = false;
                      // model.showTOC = true;
                      model.tocLocation = "right";

                      // Enable Progress Bar at the top
                      model.showProgressBar = true;
                      model.progressBarLocation = "top";
                      model.progressBarType = "pages";
                      model.progressBarShowPageNumbers = false;
                      model.progressBarShowPageTitles = true;

                      // Set the survey data (CurrentValues)
                      if (surveyJson.data) {
                        model.data = surveyJson.data;
                      }

                      /* COMMENTED OUT: Custom camera capture functionality
                    // Add custom behavior for camera buttons
                    model.onAfterRenderQuestion.add((sender, options) => {
                      const question = options.question;
                      if (question.getType() === "file" && question.sourceType === "file-camera") {
                        
                        const interceptCameraButtons = () => {
                          const questionElement = options.htmlElement;
                          if (!questionElement) return;
                          
                          // Find all potential camera buttons
                          const allButtons = questionElement.querySelectorAll('button, .sd-file__choose-btn, .sd-action-bar-item');
                          
                          allButtons.forEach((button: any, index: number) => {
                            const buttonText = button.textContent?.toLowerCase() || '';
                            const buttonTitle = button.title?.toLowerCase() || '';
                            const buttonClass = button.className?.toLowerCase() || '';
                            
                            // Check if this looks like a camera button
                            if (buttonText.includes('photo') || buttonText.includes('camera') || 
                                buttonTitle.includes('camera') || 
                                buttonClass.includes('camera')) {
                              
                              if (!button.dataset.customHandler) {
                                button.dataset.customHandler = 'true';
                                
                                // Hide the original button
                                button.style.display = 'none';
                                
                                // Create our custom button
                                const customButton = document.createElement('button');
                                customButton.textContent = '📷 Take Photo';
                                customButton.className = button.className;
                                customButton.style.cssText = button.style.cssText;
                                customButton.style.display = 'inline-block';
                                
                                customButton.onclick = (e: any) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openCustomCamera(question.name);
                                  return false;
                                };
                                
                                // Insert custom button after the original
                                button.parentNode?.insertBefore(customButton, button.nextSibling);
                              }
                            }
                          });
                        };
                        
                        // Try multiple times as the DOM may update
                        setTimeout(interceptCameraButtons, 50);
                        setTimeout(interceptCameraButtons, 150);
                        setTimeout(interceptCameraButtons, 300);
                        setTimeout(interceptCameraButtons, 500);
                      }
                    });
                    */

                      return model;
                    })()}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!surveyJson && !loading && (
        <div className="bg-white shadow-md p-12 rounded-lg text-gray-500 text-center">
          <svg
            className="mx-auto mb-4 w-16 h-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>
            Select a template and asset ID, then click Generate Survey to see
            the preview
          </p>
        </div>
      )}

      {/* COMMENTED OUT: Full Screen Camera Modal
      {showCamera && (
        <FullScreenCamera
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      )}
      */}
    </div>
  );
}

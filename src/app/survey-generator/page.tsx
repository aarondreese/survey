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
  };
  data: Record<string, unknown>;
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
  const [showAddressDropdown, setShowAddressDropdown] = useState<boolean>(false);
  const [searchingAddress, setSearchingAddress] = useState<boolean>(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);
  const surveyModelRef = useRef<Model | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      const response: Response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
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
        address.PostCode
      ].filter(Boolean).join(", ");
      setAddressSearch(fullAddress);
      setShowAddressDropdown(false);
    }
  };

  // Helper function to process individual elements
  const processElement = (
    element: any,
    instanceId: any,
    rawPageId: number,
    surveyData: Record<string, any>,
    assetIdValue: number,
    attributeId: any
  ) => {
    // Make element name unique
    const originalName = element.name;
    if (instanceId !== undefined && instanceId !== null) {
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
      // Normalize choices to ensure lowercase 'value' and 'text' properties
      element.choices = choices.map((choice: any) => ({
        value: choice.value !== undefined ? choice.value : choice.Value,
        text: choice.text !== undefined ? choice.text : choice.Text,
      }));

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
        if (imageData && imageData.trim() !== '') {
          const formattedImage = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
          
          // Check if we have actual image data (not just the header)
          const hasActualData = formattedImage.length > 'data:image/jpeg;base64,'.length + 10;
          
          if (hasActualData) {
            // Only set in surveyData if we have a valid image with content
            surveyData[element.name] = [{
              name: "existing-image.jpg",
              type: "image/jpeg",
              content: formattedImage
            }];
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
        data: currentData
      };

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
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            surveyTemplateHeaderId: templateId,
            entityReference: `Asset_${assetId}`,
            surveyInstanceId: surveyInstanceIdResult, // null for first chunk
            chunk: chunk,
            chunkIndex: i,
            totalChunks: totalChunks,
            isLastChunk: i === totalChunks - 1
          })
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

      // Build survey data object to hold all current values
      const surveyData: Record<string, any> = {};

      // Parse all pages from API
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

            const pageData = Array.isArray(page.ParsedJSON)
              ? page.ParsedJSON[0]
              : page.ParsedJSON;

            // Extract instance and attributeId - prefer API level, fallback to ParsedJSON
            const instanceId = page.InstanceID ?? pageData.instance;
            const attributeId = page.AttributeID ?? pageData.attributeId;
            const pageSplit = page.PageSplit;
            const pageSplitIdentifier = page.PageSplitIdentifier;

            return {
              rawPageId: page.ID,
              pageData,
              instanceId,
              attributeId,
              pageSplit,
              pageSplitIdentifier,
            };
          }
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
              panel.elements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData,
                  assetId,
                  attributeId
                );
              });
            }

            surveyPage.elements.push(panel);
          });

          surveyPages.push(surveyPage);
        } else {
          // No identifier - each gets its own page
          group.forEach((p: any) => {
            const pageData = p.pageData;
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
              surveyPage.elements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData,
                  assetId,
                  attributeId
                );
              });
            }

            surveyPages.push(surveyPage);
          });
        }
      });

      const fullSurvey = {
        pages: surveyPages,
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
              <div className="absolute right-3 top-3">
                <div className="border-gray-300 border-t-blue-600 rounded-full border-2 w-4 h-4 animate-spin"></div>
              </div>
            )}
            
            {/* Address Dropdown */}
            {showAddressDropdown && addressResults.length > 0 && (
              <div className="absolute z-10 bg-white shadow-lg mt-1 border border-gray-300 rounded-md w-full max-h-60 overflow-y-auto">
                {addressResults.map((address) => (
                  <button
                    key={address.AddressID}
                    onClick={() => handleAddressSelect(address)}
                    className="block hover:bg-blue-50 p-3 border-b border-gray-200 w-full text-left last:border-b-0"
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
          {addressResults.length === 0 && addressSearch.length >= 2 && !searchingAddress && (
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
                  <div className="mt-1">Survey Instance ID: <span className="font-mono font-bold">{surveyInstanceId}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved Survey Warning */}
          {!surveyInstanceId && (
            <div className="bg-yellow-100 mb-4 p-4 border border-yellow-400 rounded text-yellow-700">
              <strong>⚠ Survey Not Saved</strong>
              <div className="mt-1">Click the &quot;Save Survey&quot; button above to create a survey instance.</div>
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

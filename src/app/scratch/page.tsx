"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeButton from "@/components/HomeButton";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";
import type { SurveyTemplateHeader } from "@/types/surveys";

export default function ScratchPage() {
  const [templates, setTemplates] = useState<SurveyTemplateHeader[]>([]);
  const [templateId, setTemplateId] = useState<number>(0);
  const [assetId, setAssetId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [surveyJson, setSurveyJson] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawPages, setRawPages] = useState<
    Array<{ ID: number; JSONText: string }>
  >([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/surveys");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const result = await response.json();
      // Extract data from wrapped response
      const data = result.data || result;
      // Ensure data is always an array
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setTemplates([]);
    }
  };

  // Helper function to process individual elements
  const processElement = (
    element: any,
    instanceId: any,
    rawPageId: number,
    surveyData: Record<string, any>
  ) => {
    // Make element name unique
    const originalName = element.name;
    if (instanceId !== undefined && instanceId !== null) {
      element.name = `instance_${instanceId}_${originalName}`;
    } else {
      element.name = `page_${rawPageId}_${originalName}`;
    }

    console.log("Processing element:", element.name);
    console.log(
      "  currentValue:",
      element.currentValue,
      "(type:",
      typeof element.currentValue,
      ")"
    );
    console.log(
      "  defaultValue:",
      element.defaultValue,
      "(type:",
      typeof element.defaultValue,
      ")"
    );
    console.log(
      "  choices (raw):",
      element.choices,
      "(type:",
      typeof element.choices,
      ")"
    );

    // Parse choices if it's a string
    let choices = element.choices;
    if (typeof choices === "string") {
      try {
        choices = JSON.parse(choices);
        element.choices = choices; // Update the element with parsed choices
        console.log("  choices (parsed):", choices);
      } catch (e) {
        console.error("  Error parsing choices:", e);
        choices = null;
      }
    }

    // Verify choices structure and log each choice
    if (choices && Array.isArray(choices)) {
      console.log("  Choices array has", choices.length, "items:");
      choices.forEach((choice: any, idx: number) => {
        console.log(`    [${idx}] Raw choice:`, choice);
        console.log(
          `    [${idx}] value:`,
          choice.value,
          "Value:",
          choice.Value,
          "(type:",
          typeof (choice.value || choice.Value),
          ")"
        );
        console.log(
          `    [${idx}] text:`,
          choice.text,
          "Text:",
          choice.Text,
          "(type:",
          typeof (choice.text || choice.Text),
          ")"
        );
      });

      // Normalize choices to ensure lowercase 'value' and 'text' properties
      element.choices = choices.map((choice: any) => ({
        value: choice.value !== undefined ? choice.value : choice.Value,
        text: choice.text !== undefined ? choice.text : choice.Text,
      }));

      console.log("  Normalized choices:", element.choices);
      // Update the local choices variable to use normalized version
      choices = element.choices;
    }

    // Determine the value to use: currentValue takes precedence, then defaultValue
    const valueToUse =
      element.currentValue !== undefined && element.currentValue !== null
        ? element.currentValue
        : element.defaultValue;

    console.log("  valueToUse:", valueToUse);

    // Debug: Add currentValue and matched option to title
    if (valueToUse !== undefined && valueToUse !== null) {
      let debugText = `${element.title || element.name}`;

      if (element.currentValue !== undefined && element.currentValue !== null) {
        debugText += ` (CV: ${element.currentValue}`;
      } else if (
        element.defaultValue !== undefined &&
        element.defaultValue !== null
      ) {
        debugText += ` (DV: ${element.defaultValue}`;
      }

      if (choices && Array.isArray(choices)) {
        console.log("  Looking for match in", choices.length, "choices");

        const matchedChoice = choices.find((choice: any) => {
          // Convert both to strings for comparison to handle type mismatches
          const choiceValueStr = String(choice.value);
          const valueToUseStr = String(valueToUse);
          const matches = choiceValueStr === valueToUseStr;
          console.log(
            "    Checking choice.value:",
            choice.value,
            "(",
            typeof choice.value,
            ") == valueToUse:",
            valueToUse,
            "(",
            typeof valueToUse,
            "):",
            matches
          );
          return matches;
        });

        if (matchedChoice) {
          debugText += ` => "${matchedChoice.text}"`;
          console.log("  ✓ MATCHED:", matchedChoice);
        } else {
          debugText += " => NO MATCH";
          console.log("  ⚠️ NO MATCH FOUND");
        }
      }
      debugText += ")";
      element.title = debugText;
    }

    // Initialize survey data from currentValue or defaultValue
    // This sets the initial selected value in the survey
    if (valueToUse !== undefined && valueToUse !== null) {
      if (choices && Array.isArray(choices)) {
        const matchedChoice = choices.find((choice: any) => {
          // Convert both to strings for comparison
          return String(choice.value) === String(valueToUse);
        });

        if (matchedChoice) {
          // Store the matched choice value (use the actual choice.value, not the string)
          surveyData[element.name] = matchedChoice.value;
          console.log(
            "✓ Set initial value for",
            element.name,
            "to",
            matchedChoice.value,
            "(type:",
            typeof matchedChoice.value,
            "), text:",
            matchedChoice.text
          );
        } else {
          console.warn(
            "⚠️ NO MATCHING CHOICE for",
            element.name,
            "valueToUse:",
            valueToUse
          );
          // Try to convert to number if it looks like a number
          const numValue = Number(valueToUse);
          surveyData[element.name] = !isNaN(numValue) ? numValue : valueToUse;
        }
      } else {
        // No choices, just use the value directly
        surveyData[element.name] = valueToUse;
        console.log(
          "Set initial value (no choices) for",
          element.name,
          "to",
          valueToUse
        );
      }
    }

    // DON'T delete currentValue or defaultValue - preserve them for future use
    // Only clean up page-level properties that shouldn't be on elements
    delete element.instance;
    delete element.pageSplit;
    delete element.pageSplitIdentifier;

    // Final verification log
    console.log("Final element state for", element.name, ":");
    console.log("  type:", element.type);
    console.log("  choices:", element.choices);
    console.log("  currentValue:", element.currentValue);
    console.log("  defaultValue:", element.defaultValue);
    console.log("  surveyData[", element.name, "]:", surveyData[element.name]);

    return element;
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

      const response = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, assetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate survey");
      }

      const data = await response.json();
      console.log("Raw data from API:", data);
      setRawPages(data.pages);

      // Build survey data object to hold all current values
      const surveyData: Record<string, any> = {};

      // Parse all pages from API
      const parsedPages = data.pages
        .map((page: { ID: number; JSONText: string; ParsedJSON: any }) => {
          console.log(
            "Processing raw page:",
            page.ID,
            "ParsedJSON:",
            page.ParsedJSON
          );
          if (!page.ParsedJSON) {
            console.error("Page missing ParsedJSON property:", page);
            return null;
          }

          const pageData = Array.isArray(page.ParsedJSON)
            ? page.ParsedJSON[0]
            : page.ParsedJSON;

          // Extract new properties (camelCase)
          const instanceId = pageData.instance;
          const pageSplit = pageData.pageSplit;
          const pageSplitIdentifier = pageData.pageSplitIdentifier;

          console.log(
            "Page ID:",
            page.ID,
            "- instance:",
            instanceId,
            "pageSplit:",
            pageSplit,
            "pageSplitIdentifier:",
            pageSplitIdentifier
          );
          console.log("Page elements count:", pageData.elements?.length);

          // Log first element to see structure
          if (pageData.elements && pageData.elements.length > 0) {
            console.log(
              "First element in page:",
              JSON.stringify(pageData.elements[0], null, 2)
            );
          }

          return {
            rawPageId: page.ID,
            pageData,
            instanceId,
            pageSplit,
            pageSplitIdentifier,
          };
        })
        .filter((p: any) => p !== null);

      // Group pages by pageSplitIdentifier
      const pageGroups = new Map<string | null, any[]>();

      parsedPages.forEach((p: any) => {
        const identifier = p.pageSplitIdentifier || null;
        if (!pageGroups.has(identifier)) {
          pageGroups.set(identifier, []);
        }
        pageGroups.get(identifier)!.push(p);
      });

      console.log("Page groups:", pageGroups);

      // Build Survey.js pages structure
      const surveyPages: any[] = [];

      pageGroups.forEach((group, identifier) => {
        console.log(
          "Processing group with identifier:",
          identifier,
          "- pages:",
          group.length
        );

        if (identifier && group.length > 1) {
          // Multiple question sets with same identifier - put in sections on one page
          const surveyPage: any = {
            name: `page_${identifier}`,
            title: identifier,
            elements: [],
          };

          group.forEach((p: any, idx: number) => {
            const pageData = p.pageData;
            const instanceId = p.instanceId;

            // Create a panel (section) for this question set
            const panel: any = {
              type: "panel",
              name: `panel_${identifier}_${idx}`,
              title:
                instanceId !== undefined && instanceId !== null
                  ? `${
                      pageData.title || pageData.name || "Section"
                    } (Instance: ${instanceId})`
                  : pageData.title || pageData.name || "Section",
              elements: [],
            };

            // Process elements
            if (pageData.elements) {
              panel.elements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData
                );
              });
            }

            surveyPage.elements.push(panel);
          });

          surveyPages.push(surveyPage);
        } else {
          // Single question set or no identifier - each gets its own page
          group.forEach((p: any) => {
            const pageData = p.pageData;
            const instanceId = p.instanceId;

            const surveyPage: any = {
              name:
                instanceId !== undefined && instanceId !== null
                  ? `page_instance_${instanceId}`
                  : `page_${p.rawPageId}`,
              title: pageData.title || pageData.name || "Page",
              elements: [],
            };

            // Add instance info to title if exists
            if (instanceId !== undefined && instanceId !== null) {
              surveyPage.title = `${surveyPage.title} (Instance: ${instanceId})`;
              surveyPage.description = `Instance ID: ${instanceId}`;
            }

            // Process elements
            if (pageData.elements) {
              surveyPage.elements = pageData.elements.map((element: any) => {
                return processElement(
                  element,
                  instanceId,
                  p.rawPageId,
                  surveyData
                );
              });
            }

            surveyPages.push(surveyPage);
          });
        }
      });

      console.log("Final survey pages:", surveyPages);
      console.log("Survey data:", surveyData);

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
        <h1 className="font-bold text-3xl">Survey Generator - Scratch Tool</h1>
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
              Asset ID
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
      </div>

      {/* Survey Preview */}
      {surveyJson && (
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

                    // Set the survey data (CurrentValues)
                    if (surveyJson.data) {
                      model.data = surveyJson.data;
                      console.log("Set survey data:", surveyJson.data);
                    }

                    // Add page number to each page title
                    model.onCurrentPageChanged.add((sender) => {
                      const currentPage = sender.currentPage;
                      if (currentPage) {
                        const pageNo = sender.currentPageNo + 1;
                        const totalPages = sender.visiblePageCount;
                        const originalTitle =
                          currentPage.title || currentPage.name || "Page";

                        // Only add page number if not already present
                        if (!originalTitle.includes("[Page")) {
                          currentPage.title = `[Page ${pageNo} of ${totalPages}] ${originalTitle}`;
                        }
                      }
                    });

                    // Set initial page title
                    if (model.currentPage) {
                      const pageNo = model.currentPageNo + 1;
                      const totalPages = model.visiblePageCount;
                      const originalTitle =
                        model.currentPage.title ||
                        model.currentPage.name ||
                        "Page";
                      model.currentPage.title = `[Page ${pageNo} of ${totalPages}] ${originalTitle}`;
                    }

                    return model;
                  })()}
                />
              </div>
            </div>

            {/* Debug Panel */}
            <div className="mt-4">
              <details className="bg-gray-800 rounded-lg overflow-hidden">
                <summary className="hover:bg-gray-700 px-4 py-2 font-medium text-white text-sm cursor-pointer">
                  Debug: Full Survey JSON
                </summary>
                <div className="p-4 border-gray-700 border-t">
                  <pre className="overflow-x-auto font-mono text-green-400 text-xs">
                    {JSON.stringify(surveyJson, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>

          {/* Right: Raw Pages */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="mb-4 font-semibold text-xl">
              Raw Pages from Stored Procedure
            </h2>
            <div
              className="space-y-4 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 400px)" }}
            >
              {rawPages.map((page) => (
                <div key={page.ID} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm">Page {page.ID}</h3>
                  </div>
                  <details className="bg-gray-100 rounded overflow-hidden">
                    <summary className="hover:bg-gray-200 px-3 py-2 font-medium text-sm cursor-pointer">
                      View JSON
                    </summary>
                    <div className="p-3 border-t">
                      <pre className="overflow-x-auto font-mono text-xs">
                        {JSON.stringify(JSON.parse(page.JSONText), null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
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
    </div>
  );
}

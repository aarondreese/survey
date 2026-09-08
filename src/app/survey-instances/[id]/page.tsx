"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import HomeButton from "@/components/HomeButton";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";

interface SurveyInstanceDetail {
  ID: number;
  SurveyTemplateHeaderID: number;
  EntityReference: string;
  InstanceCreatedDate: string;
  SurveyJSON?: string;
  CompletedJSON?: string;
  CompletedDate?: string;
  TemplateName?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  Town?: string;
  County?: string;
  PostCode?: string;
}

// Helper function to convert image type elements to file type with camera support
function convertImageToFile(element: any) {
  if (element.type === "image") {
    const isReadOnly = element.readOnly === true;

    if (!isReadOnly) {
      // Convert to file type with camera capture
      element.type = "file";
      element.sourceType = "file-camera";
      element.acceptedTypes = "image/*";
      element.storeDataAsText = true;
      element.allowImagesPreview = true;
      element.maxSize = 10485760; // 10MB
      element.needConfirmRemoveFile = false;
      element.waitForUpload = true;
      element.allowMultiple = false;

      // Clean up image-specific properties
      delete element.imageLink;
      delete element.contentMode;
    }
  }
}

// Compute a canonical element name.
function computeElementName(rawName: any, fieldName: any, attributeTypeID: any, idx: number) {
  try {
    if (attributeTypeID !== undefined && attributeTypeID !== null) {
      const suffix = String(fieldName || rawName || idx).replace(/\s+/g, '_');
      return `attributeTypeID_${String(attributeTypeID)}_${suffix}`;
    }
    const candidate = String(rawName || fieldName || `meta_${idx}`);
    const m = candidate.match(/^instance_\d+_(.+)$/);
    if (m && m[1]) return m[1];
    return candidate;
  } catch {
    return String(rawName || fieldName || `meta_${idx}`);
  }
}

export default function SurveyInstanceDetailPage() {
  const params = useParams();
  const instanceId = params.id as string;

  const [instance, setInstance] = useState<SurveyInstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const surveyModelRef = useRef<Model | null>(null);
  const originalSurveyJsonRef = useRef<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugState, setDebugState] = useState<any>({
    messages: [],
    lastChoice: null,
    embedded: null,
    surveyJson: null,
    originalSurveyJson: null,
    modelSnapshot: null,
  });

  // Handler: when a meta-question option contains embedded question-set JSON
  // under `meta-contents`, inject those elements into the current page.
  const handleMetaChoice = useCallback((sender: any, options: any) => {
    try {
      const qName = String(options?.name || "");
      if (!qName) return;
      const question = sender.getQuestionByName(qName);
      if (!question) return;

      const selectedValue = options?.value;
      if (selectedValue === undefined || selectedValue === null) return;

      // Find the selected choice object from the question.choices array
      const choices = question.choices || [];
      let choiceObj: any = null;
      for (const c of choices) {
        const val = c && typeof c === "object" && "value" in c ? c.value : c;
        if (String(val) === String(selectedValue)) {
          choiceObj = c;
          break;
        }
      }
      if (!choiceObj) return;

      let embedded =
        choiceObj["meta-contents"] ||
        choiceObj.metaContents ||
        choiceObj.meta_contents ||
        choiceObj.questionSet ||
        choiceObj.questionSetJson ||
        null;
      console.log("meta-choice selected", {
        name: qName,
        value: selectedValue,
        choiceObj,
        embedded,
      });
      setDebugState((s: any) => ({
        ...s,
        messages: [
          ...s.messages,
          `meta-choice selected: ${qName}=${String(selectedValue)}`,
        ],
        lastChoice: choiceObj,
        embedded,
      }));

      // If embedded not present on the runtime choice object, try to find it
      // in the original DB SurveyJSON (stored in a ref) before falling back
      // to network fetch.
      if (!embedded && originalSurveyJsonRef.current) {
        try {
          const dbJson = originalSurveyJsonRef.current;
          let found: any = null;
          const pages = Array.isArray(dbJson.pages) ? dbJson.pages : [];
          for (const p of pages) {
            const els = Array.isArray(p.elements) ? p.elements : [];
            for (const el of els) {
              // direct element name match
              if (el && el.name && String(el.name) === String(qName)) {
                const dbChoices = Array.isArray(el.choices) ? el.choices : [];
                for (const dc of dbChoices) {
                  const v =
                    dc && typeof dc === "object" && "value" in dc
                      ? dc.value
                      : dc;
                  if (String(v) === String(selectedValue)) {
                    found = dc;
                    break;
                  }
                }
                if (found) break;
              }
              // If panel, search its inner elements
              if (el && el.type === "panel" && Array.isArray(el.elements)) {
                for (const subEl of el.elements) {
                  if (
                    subEl &&
                    subEl.name &&
                    String(subEl.name) === String(qName)
                  ) {
                    const dbChoices = Array.isArray(subEl.choices)
                      ? subEl.choices
                      : [];
                    for (const dc of dbChoices) {
                      const v =
                        dc && typeof dc === "object" && "value" in dc
                          ? dc.value
                          : dc;
                      if (String(v) === String(selectedValue)) {
                        found = dc;
                        break;
                      }
                    }
                    if (found) break;
                  }
                }
                if (found) break;
              }
            }
            if (found) break;
          }
          if (found) {
            console.log("Found original choice in DB JSON", found);
            setDebugState((s: any) => ({
              ...s,
              messages: [...s.messages, "Found original choice in DB JSON"],
              lastChoice: found,
            }));
            // If original has meta-contents, use that as embedded
            const origEmbedded =
              found["meta-contents"] ||
              found.metaContents ||
              found.meta_contents ||
              found.questionSet ||
              found.questionSetJson ||
              null;
            if (origEmbedded) {
              // override embedded and choiceObj with original
              embedded = origEmbedded;
              choiceObj = found;
            }
          }
        } catch (e) {
          console.warn(
            "Error searching original SurveyJSON for choice metadata",
            e,
          );
        }
      }

      let elems: any[] = [];
      if (typeof embedded === "string") {
        try {
          const parsed = JSON.parse(embedded);
          if (Array.isArray(parsed)) elems = parsed;
          else if (parsed && Array.isArray(parsed.elements))
            elems = parsed.elements;
          else elems = [parsed];
        } catch {
          return;
        }
      } else if (Array.isArray(embedded)) {
        elems = embedded;
      } else if (embedded && Array.isArray(embedded.elements)) {
        elems = embedded.elements;
      } else if (embedded) {
        elems = [embedded];
      }

      if (elems.length === 0) {
        // No embedded payload - fallback to fetching question-set by ID if the choice value looks like an ID
        const qsId = Number(selectedValue);
        if (!Number.isNaN(qsId) && qsId > 0) {
          (async () => {
            try {
              const [qsRes, qsQuestionsRes] = await Promise.all([
                fetch(`/api/questionsets/${qsId}`),
                fetch(`/api/questionset-questions/${qsId}`),
              ]);
              if (!qsRes.ok || !qsQuestionsRes.ok) return;
              const qsData = await qsRes.json();
              const qsHeader = qsData?.data;
              const qsQuestionsData = await qsQuestionsRes.json();
              const questionsArray = Array.isArray(qsQuestionsData?.data)
                ? qsQuestionsData.data
                : [];

              // Map into elements similar to embedded flow
              const mappedElems = questionsArray.map((q: any, idx: number) => {
                const el: any = {
                  type:
                    q.displayType &&
                    String(q.displayType).toLowerCase().includes("date")
                      ? "date"
                      : q.displayType
                        ? q.displayType
                        : "text",
                  name: computeElementName(q.name ?? q.fieldName, q.fieldName, q.attributeTypeID ?? q.attributeTypeId, idx),
                  title:
                    q.surveyLabel ||
                    q.attributeLabel ||
                    q.fieldName ||
                    `Question ${idx + 1}`,
                  choices: (() => {
                    try {
                      if (q.choices && typeof q.choices === "string")
                        return JSON.parse(q.choices);
                    } catch {}
                    return Array.isArray(q.choices) ? q.choices : undefined;
                  })(),
                  defaultValue: null,
                  isRequired: q.isRequired === true,
                };
                return el;
              });

              if (mappedElems.length > 0) {
                console.log(
                  "Fallback fetched question-set mappedElems",
                  mappedElems,
                );
                setDebugState((s: any) => ({
                  ...s,
                  messages: [
                    ...s.messages,
                    `Fetched and mapped ${mappedElems.length} questions for question-set ${qsId}`,
                  ],
                  lastChoice: choiceObj,
                  embedded: mappedElems,
                }));
                // Inject mapped elements into page
                const page = question.page;
                if (!page) return;
                const panelName = `meta_injected_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                let newPanel: any = null;
                if (typeof page.addNewPanel === "function")
                  newPanel = page.addNewPanel(panelName);
                mappedElems.forEach((el: any, idx: number) => {
                  const rawType = String(el.type || "text");
                  let surveyType = rawType.toLowerCase();
                  let inputType: string | undefined = undefined;
                  if (surveyType === "number" || surveyType.includes("int") || surveyType === "integer" || surveyType === "numeric") { surveyType = "text"; inputType = "number"; }
                  else if (surveyType === "date") { surveyType = "text"; inputType = "date"; }
                  else if (surveyType === "textarea" || surveyType === "longtext" || surveyType === "maxtext") surveyType = "comment";
                  else if (surveyType === "checkboxes" || surveyType === "checkbox") surveyType = "checkbox";
                  else if (surveyType === "radiogroup" || surveyType === "radio") surveyType = "radiogroup";
                  else if (surveyType === "dropdown" || surveyType === "select") surveyType = "dropdown";

                  const qNameLocal = computeElementName(el.name, el.fieldName, el.attributeTypeID ?? el.attributeTypeId, idx);
                  let newQ: any = null;
                  if (newPanel && typeof newPanel.addNewQuestion === "function") newQ = newPanel.addNewQuestion(surveyType, qNameLocal);
                  else if (typeof page.addNewQuestion === "function") newQ = page.addNewQuestion(surveyType, qNameLocal);

                  if (!newQ) {
                    console.warn('Cannot create Question instance; skipping element', el);
                    setDebugState((s: any) => ({ ...s, messages: [...s.messages, 'Skipped raw element injection'] }));
                    return;
                  }

                  newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
                  newQ.isRequired = el.isRequired === true;
                  newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
                  if (inputType) newQ.inputType = inputType;

                  if (Array.isArray(el.choices)) {
                    const normalized = el.choices.map((c: any) => {
                      if (c && typeof c === 'object') {
                        const v = c.value !== undefined ? c.value : (c.Value !== undefined ? c.Value : c.value);
                        const t = c.text !== undefined ? c.text : (c.Text !== undefined ? c.Text : String(v));
                        return { ...c, value: v, text: t };
                      }
                      return { value: c, text: String(c) };
                    });
                    newQ.choices = normalized;
                  }

                  if (el.defaultValue !== undefined) newQ.defaultValue = el.defaultValue;
                  // Preserve source metadata to allow transforming keys on save
                  try {
                    if (el.attributeTypeID !== undefined || el.attributeTypeId !== undefined) {
                      newQ.attributeTypeID = el.attributeTypeID ?? el.attributeTypeId;
                    }
                    if (el.fieldName !== undefined) newQ.fieldName = el.fieldName;
                    if (el.name !== undefined && !newQ.fieldName) newQ.fieldName = el.name;
                  } catch {}
                });

                try {
                  question.visible = false;
                } catch {}
                surveyModelRef.current = sender;
                setSurveyModel(sender);
              }
            } catch (err) {
              console.error(
                "Failed to fetch/inject question-set fallback:",
                err,
              );
            }
          })();
        }
        return;
      }

      const page = question.page;
      if (!page) return;

      const panelName = `meta_injected_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      let newPanel: any = null;
      console.log("Injecting meta elements into page", { panelName, elems });
      setDebugState((s: any) => ({
        ...s,
        messages: [
          ...s.messages,
          `Injecting ${elems.length} elements into page ${page.name || "<unnamed>"}`,
        ],
      }));

      // If embedded is a single panel-like object (has elements), make that the root panel
      const isPanelSpec =
        elems.length === 1 && elems[0] && Array.isArray(elems[0].elements);
      if (isPanelSpec) {
        const spec = elems[0];
        const panelId = spec.name || panelName;
        if (typeof page.addNewPanel === "function")
          newPanel = page.addNewPanel(panelId);
        else if (!Array.isArray(page.elements)) page.elements = [];

        if (newPanel) {
          if (spec.title) newPanel.title = spec.title;
          if (spec.description) newPanel.description = spec.description;
          if (spec.name) newPanel.name = spec.name;
        } else {
          // Cannot create a real Panel instance - log and skip injecting raw panel object
          console.warn(
            "Cannot create Panel instance on page; skipping raw panel injection",
            { panelId, spec },
          );
          setDebugState((s: any) => ({
            ...s,
            messages: [...s.messages, `Skipped raw panel injection ${panelId}`],
          }));
        }

      const children = spec.elements || [];
      children.forEach((el: any, idx: number) => {
          const rawType = String(el.type || el.questionType || "text");
          let surveyType = rawType.toLowerCase();
          let inputType: string | undefined = undefined;
          if (surveyType === 'number' || surveyType.includes('int') || surveyType === 'integer' || surveyType === 'numeric') { surveyType = 'text'; inputType = 'number'; }
          else if (surveyType === 'date') { surveyType = 'text'; inputType = 'date'; }
          else if (surveyType === 'textarea' || surveyType === 'longtext' || surveyType === 'maxtext') surveyType = 'comment';
          else if (surveyType === 'checkboxes' || surveyType === 'checkbox') surveyType = 'checkbox';
          else if (surveyType === 'radiogroup' || surveyType === 'radio') surveyType = 'radiogroup';
          else if (surveyType === 'dropdown' || surveyType === 'select') surveyType = 'dropdown';

          const qNameLocal = computeElementName(el.name, el.fieldName, el.attributeTypeID ?? el.attributeTypeId, idx);
          let newQ: any = null;
          if (newPanel && typeof newPanel.addNewQuestion === "function") newQ = newPanel.addNewQuestion(surveyType, qNameLocal);
          else if (typeof page.addNewQuestion === "function") newQ = page.addNewQuestion(surveyType, qNameLocal);
          if (!newQ) { console.warn('Cannot create Question instance; skipping element', el); setDebugState((s: any) => ({ ...s, messages: [...s.messages, 'Skipped raw element injection'] })); return; }
          newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
          newQ.isRequired = el.isRequired === true;
          newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
          if (inputType) newQ.inputType = inputType;
          if (Array.isArray(el.choices)) {
            const normalized = el.choices.map((c: any) => {
              if (c && typeof c === 'object') {
                const v = c.value !== undefined ? c.value : (c.Value !== undefined ? c.Value : c.value);
                const t = c.text !== undefined ? c.text : (c.Text !== undefined ? c.Text : String(v));
                return { ...c, value: v, text: t };
              }
              return { value: c, text: String(c) };
            });
            newQ.choices = normalized;
          }
          if (el.defaultValue !== undefined) newQ.defaultValue = el.defaultValue;
                  // Preserve source metadata to allow transforming keys on save
                  try {
                    if (el.attributeTypeID !== undefined || el.attributeTypeId !== undefined) {
                      newQ.attributeTypeID = el.attributeTypeID ?? el.attributeTypeId;
                    }
                    if (el.fieldName !== undefined) newQ.fieldName = el.fieldName;
                    if (el.name !== undefined && !newQ.fieldName) newQ.fieldName = el.name;
                  } catch {}
        });
      } else {
        if (typeof page.addNewPanel === "function") {
          newPanel = page.addNewPanel(panelName);
        } else {
          // ensure elements array exists
          if (!Array.isArray(page.elements)) page.elements = [];
        }

        elems.forEach((el: any, idx: number) => {
          const rawType = String(el.type || el.questionType || "text");
          let surveyType = rawType.toLowerCase();
          let inputType: string | undefined = undefined;
          if (surveyType === 'number' || surveyType.includes('int') || surveyType === 'integer' || surveyType === 'numeric') { surveyType = 'text'; inputType = 'number'; }
          else if (surveyType === 'date') { surveyType = 'text'; inputType = 'date'; }
          else if (surveyType === 'textarea' || surveyType === 'longtext' || surveyType === 'maxtext') surveyType = 'comment';
          else if (surveyType === 'checkboxes' || surveyType === 'checkbox') surveyType = 'checkbox';
          else if (surveyType === 'radiogroup' || surveyType === 'radio') surveyType = 'radiogroup';
          else if (surveyType === 'dropdown' || surveyType === 'select') surveyType = 'dropdown';

          const qNameLocal = computeElementName(el.name, el.fieldName, el.attributeTypeID ?? el.attributeTypeId, idx);
          let newQ: any = null;
          if (newPanel && typeof newPanel.addNewQuestion === "function") {
            newQ = newPanel.addNewQuestion(surveyType, qNameLocal);
          } else if (typeof page.addNewQuestion === "function") {
            newQ = page.addNewQuestion(surveyType, qNameLocal);
          }

          if (!newQ) {
            console.warn('Cannot create Question instance; skipping element', el);
            setDebugState((s: any) => ({ ...s, messages: [...s.messages, 'Skipped raw element injection'] }));
            return;
          }

          newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
          newQ.isRequired = el.isRequired === true;
          newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
          if (inputType) newQ.inputType = inputType;
          if (Array.isArray(el.choices)) {
            const normalized = el.choices.map((c: any) => {
              if (c && typeof c === 'object') {
                const v = c.value !== undefined ? c.value : (c.Value !== undefined ? c.Value : c.value);
                const t = c.text !== undefined ? c.text : (c.Text !== undefined ? c.Text : String(v));
                return { ...c, value: v, text: t };
              }
              return { value: c, text: String(c) };
            });
            newQ.choices = normalized;
          }
          if (el.defaultValue !== undefined) newQ.defaultValue = el.defaultValue;
          // Preserve source metadata to allow transforming keys on save
          try {
            if (el.attributeTypeID !== undefined || el.attributeTypeId !== undefined) {
              newQ.attributeTypeID = el.attributeTypeID ?? el.attributeTypeId;
            }
            if (el.fieldName !== undefined) newQ.fieldName = el.fieldName;
            if (el.name !== undefined && !newQ.fieldName) newQ.fieldName = el.name;
          } catch {}
        });
      }

      // hide the meta question
      try {
        question.visible = false;
      } catch {}

      surveyModelRef.current = sender;
      setSurveyModel(sender);
    } catch (err) {
      console.error("Failed to inject meta-contents:", err);
    }
  }, []);

  const handleSurveyComplete = useCallback(
    async (sender: Model) => {
      try {
        // If this instance has no CompletedJSON (i.e. data was injected, not loaded from an existing instance)
        // transform property names into attributeTypeID_{attributeTypeID}_{field} so the backend can create attribute types.
        let completedJsonToSend: any = sender.data;
        try {
          const isExisting = Boolean(instance && instance.CompletedJSON);
          if (!isExisting && surveyModelRef.current) {
            const transformed: any = {};
            const questions = (surveyModelRef.current.getAllQuestions ? surveyModelRef.current.getAllQuestions() : []);
            for (const q of questions) {
              try {
                const name = q.name;
                const rawValue = sender.data && Object.prototype.hasOwnProperty.call(sender.data, name) ? sender.data[name] : undefined;
                // Determine attributeTypeID and field
                const attributeTypeID = q.attributeTypeID ?? q.attributeTypeId ?? (typeof name === 'string' && name.startsWith('attributeTypeID_') ? name.split('_')[1] : undefined);
                const field = q.fieldName ?? (() => {
                  if (typeof name === 'string') {
                    const m = name.match(/^attributeTypeID_\d+_(.+)$/);
                    if (m && m[1]) return m[1];
                    return name;
                  }
                  return name;
                })();

                if (attributeTypeID !== undefined && attributeTypeID !== null) {
                  const key = `attributeTypeID_${String(attributeTypeID)}_${String(field)}`.replace(/\s+/g, '_');
                  transformed[key] = rawValue;
                } else {
                  // No attributeTypeID available - preserve original key
                  transformed[name] = rawValue;
                }
              } catch (e) {
                // ignore per-question transform errors
              }
            }
            completedJsonToSend = transformed;
          }
        } catch (e) {
          console.warn('Failed to transform completed JSON keys:', e);
          completedJsonToSend = sender.data;
        }

        const response = await fetch("/api/survey-instance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: instanceId,
            completedJson: completedJsonToSend,
            completedDate: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save survey");
        }

        alert("Survey completed and saved successfully!");
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save survey");
        alert(
          "Error saving survey: " +
            (err instanceof Error ? err.message : "Unknown error"),
        );
      }
    },
    [instanceId],
  );

  const fetchInstance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/survey-instance?id=${instanceId}`);
      if (!response.ok) throw new Error("Failed to fetch survey instance");

      const result = await response.json();
      const instanceData = result.data;
      setInstance(instanceData);

      // Parse and create survey model
      if (instanceData.SurveyJSON) {
        let surveyJson: any = instanceData.SurveyJSON;
        if (typeof surveyJson === 'string') {
          try {
            surveyJson = JSON.parse(surveyJson);
          } catch (e) {
            console.warn('fetchInstance - SurveyJSON string parse failed, using raw string', e);
          }
        }
        // Save original DB JSON for debug comparison
        try {
          setDebugState((s: any) => ({
            ...s,
            originalSurveyJson: surveyJson,
            messages: [...s.messages, "Loaded original SurveyJSON from DB"],
          }));
          originalSurveyJsonRef.current = surveyJson;
          const containsMeta =
            JSON.stringify(surveyJson).includes("meta-contents");
          console.log(
            "fetchInstance - original SurveyJSON contains meta-contents?",
            containsMeta,
          );
        } catch (e) {
          console.warn(
            "fetchInstance - failed to set debug originalSurveyJson",
          );
        }

        // Convert image fields to file type with camera support
        if (surveyJson && surveyJson.pages) {
          surveyJson.pages.forEach((page: any) => {
            if (page.elements) {
              page.elements.forEach((element: any) => {
                // Handle panels (which contain elements)
                if (element.type === "panel" && element.elements) {
                  element.elements.forEach((subElement: any) => {
                    convertImageToFile(subElement);
                  });
                } else {
                  convertImageToFile(element);
                }
              });
            }
          });
        }

        const model = new Model(surveyJson);
        model.applyTheme(LayeredLight);
        // Progress bar configuration
        model.showProgressBar = true;
        model.progressBarLocation = "top";

        model.progressBarType = "pages";
        model.progressBarShowPageNumbers = false;
        model.progressBarShowPageTitles = true;

        // Load completed data if exists, otherwise use data from surveyJson
        if (instanceData.CompletedJSON) {
          let completedData: any = instanceData.CompletedJSON;
          if (typeof completedData === 'string') {
            try {
              completedData = JSON.parse(completedData);
            } catch (e) {
              console.warn('fetchInstance - CompletedJSON string parse failed, using raw value', e);
            }
          }
          if (completedData && typeof completedData === 'object') {
            model.data = completedData;
          } else if (surveyJson.data) {
            model.data = surveyJson.data;
          }
        } else if (surveyJson.data) {
          model.data = surveyJson.data;
        }

        // Handle completion
        model.onComplete.add(handleSurveyComplete);
        // Attach meta-choice handler to inject embedded question-sets
        model.onValueChanged.add(handleMetaChoice as any);

        // If this is a completed survey and meta-questions were answered,
        // programmatically inject their question-sets so the page shows the injected details
        try {
          // Auto-inject meta question-sets for any answered meta questions
          const data = model.data || {};
          const questions = model.getAllQuestions ? model.getAllQuestions() : [];

          // Keep a copy of original data so we can remap values into injected question names
          const originalData = { ...data };

          for (const q of questions) {
            try {
              const qName = q && q.name;
              if (!qName) continue;
              const val = originalData && Object.prototype.hasOwnProperty.call(originalData, qName) ? originalData[qName] : undefined;
              if (val === undefined || val === null || val === '') continue;
              const hasChoices = Array.isArray(q.choices) && q.choices.length > 0;
              if (!hasChoices) continue;
              // Inject the question-set for this meta choice
              await (async () => handleMetaChoice(model, { name: qName, value: val }))();
            } catch (e) {
              // ignore per-question injection errors
            }
          }

          // After injection, remap original completed values into injected question names
          try {
            const allQuestionsAfter = model.getAllQuestions ? model.getAllQuestions() : [];
            const newData: any = { ...originalData };
            for (const q of allQuestionsAfter) {
              try {
                const qName = q && q.name;
                if (!qName) continue;
                // If this question has a declared fieldName (preserved from source), prefer that as original key
                const originalKeyCandidates: string[] = [];
                if (q.fieldName) originalKeyCandidates.push(q.fieldName);
                // Also consider the element's raw name without attributeTypeID prefix
                if (typeof qName === 'string') {
                  const m = qName.match(/^attributeTypeID_\d+_(.+)$/);
                  if (m && m[1]) originalKeyCandidates.push(m[1]);
                }
                // Finally, add the qName itself as a fallback
                originalKeyCandidates.push(qName);

                for (const candidate of originalKeyCandidates) {
                  if (candidate && Object.prototype.hasOwnProperty.call(originalData, candidate) && !Object.prototype.hasOwnProperty.call(newData, qName)) {
                    newData[qName] = originalData[candidate];
                    break;
                  }
                }
              } catch {}
            }
            // Assign remapped data back to model
            try {
              model.data = newData;
            } catch (e) {
              // fallback: replace values one by one
              for (const k of Object.keys(newData)) {
                try { model.setValue && model.setValue(k, newData[k]); } catch {}
              }
            }
          } catch (e) {
            console.warn('fetchInstance - failed to remap completed data into injected questions', e);
          }
        } catch (e) {
          console.warn('fetchInstance - failed to auto-inject meta question-sets for completed survey', e);
        }

        // Snapshot model immediately after creation for debug
        try {
          const modelSnap = model.toJSON();
          setDebugState((s: any) => ({
            ...s,
            modelSnapshot: modelSnap,
            messages: [...s.messages, "Created SurveyJS model snapshot"],
          }));
          console.log(
            "fetchInstance - model snapshot contains meta-contents?",
            JSON.stringify(modelSnap).includes("meta-contents"),
          );
        } catch (e) {
          console.warn("fetchInstance - failed to snapshot model");
        }

        surveyModelRef.current = model;
        setSurveyModel(model);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [instanceId, handleSurveyComplete]);

  useEffect(() => {
    return () => {
      // Cleanup model and handlers
      if (surveyModelRef.current) {
        try {
          surveyModelRef.current.onValueChanged.remove(handleMetaChoice as any);
        } catch {}
        try {
          surveyModelRef.current.onComplete.remove(handleSurveyComplete as any);
        } catch {}
        try {
          surveyModelRef.current.dispose();
        } catch {}
        surveyModelRef.current = null;
      }
    };
  }, [handleMetaChoice, handleSurveyComplete]);

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
    }
  }, [instanceId, fetchInstance]);

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <HomeButton />

      {instance && (
        <div style={{ marginBottom: "20px" }}>
          <h1>{instance.TemplateName || "Survey Instance"}</h1>
          {instance.AddressLine1 && (
            <p>
              {[
                instance.AddressLine1,
                instance.AddressLine2,
                instance.Town,
                instance.PostCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "#fee",
            border: "1px solid #f00",
            color: "#c00",
            marginBottom: "20px",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading survey...</p>
        </div>
      ) : surveyModel ? (
        <>
          <Survey model={surveyModel} />
          <div style={{ marginTop: 12 }}>
            <button
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                cursor: "pointer",
              }}
              onClick={() => {
                // refresh survey JSON snapshot for debug
                const snapshot = surveyModelRef.current
                  ? surveyModelRef.current.toJSON()
                  : null;
                setDebugState((s: any) => ({
                  ...s,
                  surveyJson: snapshot,
                  messages: [...s.messages, "Debug snapshot refreshed"],
                }));
                setShowDebugPanel((v) => !v);
              }}
            >
              {showDebugPanel ? "Hide Debug" : "Show Debug"}
            </button>
          </div>
          {showDebugPanel && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "#111",
                color: "#eee",
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
                maxHeight: "40vh",
                overflow: "auto",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Debug Messages</strong>
              </div>
              <div style={{ marginBottom: 8 }}>
                {Array.isArray(debugState.messages) &&
                debugState.messages.length > 0 ? (
                  <ul>
                    {debugState.messages.map((m: any, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "#888" }}>No messages</div>
                )}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Last Selected Choice</div>
                <pre style={{ whiteSpace: "pre-wrap", color: "#9cf" }}>
                  {JSON.stringify(debugState.lastChoice, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Embedded Payload</div>
                <pre style={{ whiteSpace: "pre-wrap", color: "#9cf" }}>
                  {JSON.stringify(debugState.embedded, null, 2)}
                </pre>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>
                  Survey Model JSON (snapshot)
                </div>
                <pre style={{ whiteSpace: "pre-wrap", color: "#9cf" }}>
                  {JSON.stringify(debugState.surveyJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <p>No survey data available</p>
        </div>
      )}
    </div>
  );
}

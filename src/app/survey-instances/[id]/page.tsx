"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  sourceTypeId?: number | null;
  sourceInstanceId: number | null;
  sourceAttributeId: number | null;
  questions: PossibleQuestionMetadata[];
}

interface AddedQuestionSetMetadata {
  key: string;
  title: string;
  uid: string;
  panelName: string;
  typeToken: string;
  instanceToken: string;
  addedAt: string;
}

const FINAL_ACTIONS_PAGE_NAME = "review_add_questions_page";
const FINAL_ACTIONS_PICKER_NAME = "__add_questionset_picker";
const FINAL_ACTIONS_CONFIRM_NAME = "__add_questionset_confirm";
const FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID = "__add_questionset_nav_action";
const USER_ADDED_PANEL_PREFIX = "added_panel_";

const sanitizeToken = (value: unknown, fallback = "na"): string => {
  const token = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return token.length > 0 ? token : fallback;
};

const extractAssetIdToken = (entityReference?: string): string => {
  const match = String(entityReference || "").match(/Asset_(\d+)/i);
  return match?.[1] || "na";
};

const buildTemplateQuestionSetsFromPossible = (
  sourceSets: PossibleQuestionSetMetadata[],
): PossibleQuestionSetMetadata[] => {
  const templateMap = new Map<string, PossibleQuestionSetMetadata>();

  for (const questionSet of sourceSets) {
    const questionSignature = questionSet.questions
      .map((question) => `${question.fieldName}|${question.type}`)
      .sort()
      .join("||");

    const templateKey = `${questionSet.title}::${questionSignature}`;

    if (!templateMap.has(templateKey)) {
      templateMap.set(templateKey, {
        ...questionSet,
        key: templateKey,
        sourcePageId: 0,
        sourcePageName: "",
        sourcePanelName: null,
        sourcePageSplitIdentifier: null,
        sourceInstanceId: null,
        sourceAttributeId: null,
      });
    }
  }

  return Array.from(templateMap.values());
};

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

function normalizeElementForSurvey(
  element: any,
  options?: { forceMetaDropdownToRadio?: boolean; forceAllDropdownToRadio?: boolean },
) {
  const rawType = String(element?.type || "text").toLowerCase();
  const hasMetaContentsChoices = Array.isArray(element?.choices)
    ? element.choices.some(
        (choice: any) =>
          choice &&
          typeof choice === "object" &&
          (choice["meta-contents"] || choice.metaContents || choice.meta_contents),
      )
    : false;

  if (
    rawType === "number" ||
    rawType.includes("int") ||
    rawType === "integer" ||
    rawType === "numeric"
  ) {
    element.type = "text";
    element.inputType = "number";
  } else if (rawType === "date") {
    element.type = "text";
    element.inputType = "date";
  } else if (
    rawType === "textarea" ||
    rawType === "longtext" ||
    rawType === "maxtext"
  ) {
    element.type = "comment";
  } else if (rawType === "checkboxes" || rawType === "checkbox") {
    element.type = "checkbox";
  } else if (rawType === "radiogroup" || rawType === "radio") {
    element.type = "radiogroup";
  } else if (rawType === "dropdown" || rawType === "select") {
    if (options?.forceAllDropdownToRadio) {
      element.type = "radiogroup";
    } else if (options?.forceMetaDropdownToRadio && hasMetaContentsChoices) {
      element.type = "radiogroup";
    } else {
      element.type = "dropdown";
    }
  } else {
    element.type = rawType;
  }

  if (Array.isArray(element?.choices)) {
    element.choices = element.choices.map((choice: any) => {
      if (choice && typeof choice === "object") {
        const value =
          choice.value !== undefined
            ? choice.value
            : choice.Value !== undefined
              ? choice.Value
              : choice.id !== undefined
                ? choice.id
                : choice.Id;
        const text =
          choice.text !== undefined
            ? choice.text
            : choice.Text !== undefined
              ? choice.Text
              : choice.label !== undefined
                ? choice.label
                : choice.Label !== undefined
                  ? choice.Label
                  : value;
        return { ...choice, value, text: String(text ?? "") };
      }
      return { value: choice, text: String(choice ?? "") };
    });
  }
}

class SurveyRenderBoundary extends React.Component<
  {
    resetKey: number;
    onError: (error: Error) => void;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  constructor(props: { resetKey: number; onError: (error: Error) => void; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (error instanceof Error) {
      this.props.onError(error);
      return;
    }
    this.props.onError(new Error(String(error)));
  }

  componentDidUpdate(prevProps: { resetKey: number }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Compute a canonical element name.
function computeElementName(
  rawName: any,
  fieldName: any,
  attributeTypeID: any,
  idx: number,
) {
  try {
    if (attributeTypeID !== undefined && attributeTypeID !== null) {
      const suffix = String(fieldName || rawName || idx).replace(/\s+/g, "_");
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
  const [possibleQuestionSets, setPossibleQuestionSets] = useState<
    PossibleQuestionSetMetadata[]
  >([]);
  const [showAddQuestionsModal, setShowAddQuestionsModal] =
    useState<boolean>(false);
  const [addingQuestionSetKey, setAddingQuestionSetKey] = useState<
    string | null
  >(null);
  const [addedQuestionSets, setAddedQuestionSets] = useState<
    AddedQuestionSetMetadata[]
  >([]);
  const addedQuestionSetsRef = useRef<AddedQuestionSetMetadata[]>([]);
  const possibleQuestionSetsRef = useRef<PossibleQuestionSetMetadata[]>([]);
  const addableQuestionSetTemplatesRef = useRef<PossibleQuestionSetMetadata[]>(
    [],
  );
  const instanceRef = useRef<SurveyInstanceDetail | null>(null);
  const possibleQuestionSetCountRef = useRef<number>(0);
  const [surveyViewVersion, setSurveyViewVersion] = useState<number>(0);
  const [compatRenderFallbackApplied, setCompatRenderFallbackApplied] =
    useState<boolean>(false);

  useEffect(() => {
    addedQuestionSetsRef.current = addedQuestionSets;
  }, [addedQuestionSets]);

  useEffect(() => {
    instanceRef.current = instance;
  }, [instance]);

  useEffect(() => {
    possibleQuestionSetCountRef.current = possibleQuestionSets.length;
  }, [possibleQuestionSets.length]);

  useEffect(() => {
    possibleQuestionSetsRef.current = possibleQuestionSets;
  }, [possibleQuestionSets]);

  const addableQuestionSetTemplates = useMemo(() => {
    return buildTemplateQuestionSetsFromPossible(possibleQuestionSets);
  }, [possibleQuestionSets]);

  useEffect(() => {
    addableQuestionSetTemplatesRef.current = addableQuestionSetTemplates;
  }, [addableQuestionSetTemplates]);

  const ensureFinalActionsPage = useCallback(
    (modelJson: { pages?: Array<Record<string, unknown>> }) => {
      if (!Array.isArray(modelJson.pages)) {
        modelJson.pages = [];
      }

      const existingFinalIndex = modelJson.pages.findIndex(
        (page) => page.name === FINAL_ACTIONS_PAGE_NAME,
      );

      if (existingFinalIndex < 0) {
        modelJson.pages.push({
          name: FINAL_ACTIONS_PAGE_NAME,
          title: "Add Questions & Complete",
          description:
            "Use the Add Questions action next to Complete to insert additional question sets.",
          elements: [],
        });
        return;
      }

      const existingFinalPage = modelJson.pages[existingFinalIndex];
      existingFinalPage.title = "Add Questions & Complete";
      existingFinalPage.description =
        "Use the Add Questions action next to Complete to insert additional question sets.";

      const existingElements = Array.isArray(existingFinalPage.elements)
        ? existingFinalPage.elements
        : [];

      const withoutPicker = existingElements.filter(
        (element) =>
          (element as { name?: string }).name !== FINAL_ACTIONS_PICKER_NAME &&
          (element as { name?: string }).name !== FINAL_ACTIONS_CONFIRM_NAME,
      );

      existingFinalPage.elements = [
        ...withoutPicker,
      ];

      if (existingFinalIndex !== modelJson.pages.length - 1) {
        const [finalPage] = modelJson.pages.splice(existingFinalIndex, 1);
        modelJson.pages.push(finalPage);
      }
    },
    [],
  );

  const buildElementFromPossibleQuestion = useCallback(
    (
      question: PossibleQuestionMetadata,
      typeToken: string,
      instanceToken: string,
      questionIndex: number,
    ): Record<string, unknown> => {
      const baseName =
        question.fieldName || question.originalName || question.generatedName;

      const normalizedName = sanitizeToken(baseName, `field_${questionIndex}`);

      const element: Record<string, unknown> = {
        type: question.type || "text",
        name: `type_${typeToken}_instance_${instanceToken}_${normalizedName}`,
        title: question.title || question.fieldName || "Untitled question",
        fieldName: question.fieldName,
        originalName: question.originalName,
        sourceGeneratedName: question.generatedName,
        isRequired: question.isRequired || question.isReadOnly,
        readOnly: false,
      };

      if (Array.isArray(question.choices) && question.choices.length > 0) {
        element.choices = question.choices.map((choice) => ({
          value: choice.value,
          text: String(choice.text ?? choice.value ?? ""),
        }));
      }

      if (
        question.answer?.currentValue !== undefined &&
        question.answer?.currentValue !== null
      ) {
        element.defaultValue = question.answer.currentValue;
      } else if (
        question.answer?.defaultValue !== undefined &&
        question.answer?.defaultValue !== null
      ) {
        element.defaultValue = question.answer.defaultValue;
      }

      return element;
    },
    [],
  );

  const injectAddedQuestionSetIntoFinalPage = useCallback(
    (
      activeModel: Model,
      questionSet: PossibleQuestionSetMetadata,
      metadata: AddedQuestionSetMetadata,
    ) => {
      const finalActionsPage = activeModel.getPageByName(FINAL_ACTIONS_PAGE_NAME) as unknown as
        | (Record<string, unknown> & {
            elements?: Array<Record<string, unknown>>;
            addNewPanel?: (name: string, index?: number) => any;
          })
        | null;

      if (!finalActionsPage || typeof finalActionsPage.addNewPanel !== "function") {
        throw new Error("Final actions page is missing");
      }

      const finalPageElements = Array.isArray(finalActionsPage.elements)
        ? finalActionsPage.elements
        : [];

      const finalPageName = String(
        (finalActionsPage as { name?: string }).name || FINAL_ACTIONS_PAGE_NAME,
      );
      const finalPageIndex = Array.isArray((activeModel as any).pages)
        ? (activeModel as any).pages.findIndex(
            (page: any) => String(page?.name || "") === finalPageName,
          )
        : -1;

      const existingPanel = finalPageElements.find(
        (element) => (element as { name?: string }).name === metadata.panelName,
      );

      if (existingPanel) {
        console.log("[survey-add] Skipping add; panel already exists", {
          questionSetKey: questionSet.key,
          panelName: metadata.panelName,
          pageName: finalPageName,
          pageIndex: finalPageIndex,
        });
        return;
      }

      const legacyControlIndex = finalPageElements.findIndex((element) => {
        const name = (element as { name?: string }).name;
        return (
          name === FINAL_ACTIONS_PICKER_NAME ||
          name === FINAL_ACTIONS_CONFIRM_NAME
        );
      });
      const insertAtIndex = legacyControlIndex >= 0 ? legacyControlIndex : undefined;

      const newPanel = finalActionsPage.addNewPanel(metadata.panelName, insertAtIndex);

      if (!newPanel) {
        throw new Error("Failed to create added panel");
      }

      newPanel.title = `${questionSet.title} (Added)`;
      newPanel.description = "Added from possible question sets";
      newPanel.isUserAddedQuestionSet = true;
      newPanel.addedQuestionSetUid = metadata.uid;
      newPanel.sourceQuestionSetKey = questionSet.key;
      newPanel.sourceInstanceId = questionSet.sourceInstanceId;
      newPanel.sourceAttributeId = questionSet.sourceAttributeId;

      console.log("[survey-add] Added question set panel", {
        questionSetKey: questionSet.key,
        questionSetTitle: questionSet.title,
        pageName: finalPageName,
        pageIndex: finalPageIndex,
        panelName: metadata.panelName,
        insertAtIndex,
      });

      questionSet.questions.forEach((question, index) => {
        const elementJson = buildElementFromPossibleQuestion(
          question,
          metadata.typeToken,
          metadata.instanceToken,
          index,
        ) as {
          type?: string;
          name?: string;
          title?: string;
          isRequired?: boolean;
          choices?: Array<{ value: unknown; text: string }>;
          defaultValue?: unknown;
          fieldName?: string;
          originalName?: string;
          sourceGeneratedName?: string;
        };

        const questionType = String(elementJson.type || "text");
        const questionName = String(elementJson.name || `added_question_${index}`);
        const newQuestion = newPanel.addNewQuestion(questionType, questionName);

        if (!newQuestion) return;

        newQuestion.title = elementJson.title || questionName;
        newQuestion.isRequired = elementJson.isRequired === true;
        newQuestion.readOnly = false;
        (newQuestion as any).fieldName = elementJson.fieldName;
        (newQuestion as any).originalName = elementJson.originalName;
        (newQuestion as any).sourceGeneratedName = elementJson.sourceGeneratedName;
        (newQuestion as any).addedQuestionSetUid = metadata.uid;

        if (Array.isArray(elementJson.choices)) {
          (newQuestion as any).choices = elementJson.choices;
        }

        if (elementJson.defaultValue !== undefined) {
          (newQuestion as any).defaultValue = elementJson.defaultValue;
        }
      });

      const currentElementNames = Array.isArray(finalActionsPage.elements)
        ? finalActionsPage.elements.map((element: any) =>
            String(element?.name || element?.type || "<unnamed>"),
          )
        : [];

      console.log("[survey-add] Final page element order after add", {
        pageName: finalPageName,
        elements: currentElementNames,
      });
    },
    [buildElementFromPossibleQuestion],
  );

  const handleAddQuestionSet = useCallback(
    (questionSet: PossibleQuestionSetMetadata) => {
      const activeModel = surveyModelRef.current || surveyModel;
      if (!activeModel) {
        return;
      }

      try {
        setAddingQuestionSetKey(questionSet.key);

        const alreadyAdded = addedQuestionSetsRef.current.some(
          (item) => item.key === questionSet.key,
        );
        if (alreadyAdded) {
          setShowAddQuestionsModal(false);
          return;
        }

        const typeToken = sanitizeToken(
          questionSet.sourceTypeId ?? questionSet.sourceAttributeId,
          "na",
        );
        const instanceToken = "na";
        const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const panelAssetToken = extractAssetIdToken(instance?.EntityReference);
        const panelName = `${USER_ADDED_PANEL_PREFIX}${panelAssetToken}_${sanitizeToken(questionSet.key)}_${uniqueSuffix}`;

        const addedMetadata: AddedQuestionSetMetadata = {
          key: questionSet.key,
          title: questionSet.title,
          uid: uniqueSuffix,
          panelName,
          typeToken,
          instanceToken,
          addedAt: new Date().toISOString(),
        };

        injectAddedQuestionSetIntoFinalPage(activeModel, questionSet, addedMetadata);

        surveyModelRef.current = activeModel;
        setSurveyModel(activeModel);
        setSurveyViewVersion((prev) => prev + 1);
        setShowAddQuestionsModal(false);
        setAddedQuestionSets((prev) => [...prev, addedMetadata]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to add selected question set",
        );
      } finally {
        setAddingQuestionSetKey(null);
      }
    },
    [surveyModel, instance, injectAddedQuestionSetIntoFinalPage],
  );

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
        // No embedded payload. Prefer local metadata and do not call API endpoints.
        const selectedToken = String(selectedValue);
        const matchedSet = possibleQuestionSetsRef.current.find((set) => {
          const typeToken = String(set.sourceTypeId ?? set.sourceAttributeId ?? "");
          return (
            set.key === `template_qs_${selectedToken}` ||
            typeToken === selectedToken
          );
        });

        if (matchedSet && Array.isArray(matchedSet.questions)) {
          elems = matchedSet.questions.map((q, idx) => ({
            type: q.type || "text",
            name:
              q.fieldName ||
              q.originalName ||
              q.generatedName ||
              `question_${idx + 1}`,
            fieldName: q.fieldName || q.originalName || q.generatedName,
            title: q.title || q.fieldName || `Question ${idx + 1}`,
            choices: Array.isArray(q.choices)
              ? q.choices.map((c) => ({
                  value: c.value,
                  text: String(c.text ?? c.value ?? ""),
                }))
              : undefined,
            defaultValue:
              q.answer?.currentValue ?? q.answer?.defaultValue ?? undefined,
            isRequired: q.isRequired === true,
          }));

          setDebugState((s: any) => ({
            ...s,
            messages: [
              ...s.messages,
              `Resolved ${elems.length} questions from local possibleQuestionSets for ${selectedToken}`,
            ],
            lastChoice: choiceObj,
            embedded: elems,
          }));
        } else {
          setDebugState((s: any) => ({
            ...s,
            messages: [
              ...s.messages,
              `No embedded or local possibleQuestionSets match for ${selectedToken}`,
            ],
            lastChoice: choiceObj,
          }));
          return;
        }
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
          if (
            surveyType === "number" ||
            surveyType.includes("int") ||
            surveyType === "integer" ||
            surveyType === "numeric"
          ) {
            surveyType = "text";
            inputType = "number";
          } else if (surveyType === "date") {
            surveyType = "text";
            inputType = "date";
          } else if (
            surveyType === "textarea" ||
            surveyType === "longtext" ||
            surveyType === "maxtext"
          )
            surveyType = "comment";
          else if (surveyType === "checkboxes" || surveyType === "checkbox")
            surveyType = "checkbox";
          else if (surveyType === "radiogroup" || surveyType === "radio")
            surveyType = "radiogroup";
          else if (surveyType === "dropdown" || surveyType === "select")
            surveyType = "dropdown";

          const qNameLocal = computeElementName(
            el.name,
            el.fieldName,
            el.attributeTypeID ?? el.attributeTypeId,
            idx,
          );
          let newQ: any = null;
          if (newPanel && typeof newPanel.addNewQuestion === "function")
            newQ = newPanel.addNewQuestion(surveyType, qNameLocal);
          else if (typeof page.addNewQuestion === "function")
            newQ = page.addNewQuestion(surveyType, qNameLocal);
          if (!newQ) {
            console.warn(
              "Cannot create Question instance; skipping element",
              el,
            );
            setDebugState((s: any) => ({
              ...s,
              messages: [...s.messages, "Skipped raw element injection"],
            }));
            return;
          }
          newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
          newQ.isRequired = el.isRequired === true;
          newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
          if (inputType) newQ.inputType = inputType;
          if (Array.isArray(el.choices)) {
            const normalized = el.choices.map((c: any) => {
              if (c && typeof c === "object") {
                const v =
                  c.value !== undefined
                    ? c.value
                    : c.Value !== undefined
                      ? c.Value
                      : c.value;
                const t =
                  c.text !== undefined
                    ? c.text
                    : c.Text !== undefined
                      ? c.Text
                      : String(v);
                return { ...c, value: v, text: t };
              }
              return { value: c, text: String(c) };
            });
            newQ.choices = normalized;
          }
          if (el.defaultValue !== undefined)
            newQ.defaultValue = el.defaultValue;
          // Preserve source metadata to allow transforming keys on save
          try {
            if (
              el.attributeTypeID !== undefined ||
              el.attributeTypeId !== undefined
            ) {
              newQ.attributeTypeID = el.attributeTypeID ?? el.attributeTypeId;
            }
            if (el.fieldName !== undefined) newQ.fieldName = el.fieldName;
            if (el.name !== undefined && !newQ.fieldName)
              newQ.fieldName = el.name;
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
          if (
            surveyType === "number" ||
            surveyType.includes("int") ||
            surveyType === "integer" ||
            surveyType === "numeric"
          ) {
            surveyType = "text";
            inputType = "number";
          } else if (surveyType === "date") {
            surveyType = "text";
            inputType = "date";
          } else if (
            surveyType === "textarea" ||
            surveyType === "longtext" ||
            surveyType === "maxtext"
          )
            surveyType = "comment";
          else if (surveyType === "checkboxes" || surveyType === "checkbox")
            surveyType = "checkbox";
          else if (surveyType === "radiogroup" || surveyType === "radio")
            surveyType = "radiogroup";
          else if (surveyType === "dropdown" || surveyType === "select")
            surveyType = "dropdown";

          const qNameLocal = computeElementName(
            el.name,
            el.fieldName,
            el.attributeTypeID ?? el.attributeTypeId,
            idx,
          );
          let newQ: any = null;
          if (newPanel && typeof newPanel.addNewQuestion === "function") {
            newQ = newPanel.addNewQuestion(surveyType, qNameLocal);
          } else if (typeof page.addNewQuestion === "function") {
            newQ = page.addNewQuestion(surveyType, qNameLocal);
          }

          if (!newQ) {
            console.warn(
              "Cannot create Question instance; skipping element",
              el,
            );
            setDebugState((s: any) => ({
              ...s,
              messages: [...s.messages, "Skipped raw element injection"],
            }));
            return;
          }

          newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
          newQ.isRequired = el.isRequired === true;
          newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
          if (inputType) newQ.inputType = inputType;
          if (Array.isArray(el.choices)) {
            const normalized = el.choices.map((c: any) => {
              if (c && typeof c === "object") {
                const v =
                  c.value !== undefined
                    ? c.value
                    : c.Value !== undefined
                      ? c.Value
                      : c.value;
                const t =
                  c.text !== undefined
                    ? c.text
                    : c.Text !== undefined
                      ? c.Text
                      : String(v);
                return { ...c, value: v, text: t };
              }
              return { value: c, text: String(c) };
            });
            newQ.choices = normalized;
          }
          if (el.defaultValue !== undefined)
            newQ.defaultValue = el.defaultValue;
          // Preserve source metadata to allow transforming keys on save
          try {
            if (
              el.attributeTypeID !== undefined ||
              el.attributeTypeId !== undefined
            ) {
              newQ.attributeTypeID = el.attributeTypeID ?? el.attributeTypeId;
            }
            if (el.fieldName !== undefined) newQ.fieldName = el.fieldName;
            if (el.name !== undefined && !newQ.fieldName)
              newQ.fieldName = el.name;
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
          const isExisting = Boolean(
            instanceRef.current && instanceRef.current.CompletedJSON,
          );
          if (!isExisting && surveyModelRef.current) {
            const transformed: any = {};
            const questions = surveyModelRef.current.getAllQuestions
              ? surveyModelRef.current.getAllQuestions()
              : [];
            for (const q of questions) {
              try {
                const name = q.name;
                const rawValue =
                  sender.data &&
                  Object.prototype.hasOwnProperty.call(sender.data, name)
                    ? sender.data[name]
                    : undefined;
                // Determine attributeTypeID and field
                const attributeTypeID =
                  q.attributeTypeID ??
                  q.attributeTypeId ??
                  (typeof name === "string" &&
                  name.startsWith("attributeTypeID_")
                    ? name.split("_")[1]
                    : undefined);
                const field =
                  q.fieldName ??
                  (() => {
                    if (typeof name === "string") {
                      const m = name.match(/^attributeTypeID_\d+_(.+)$/);
                      if (m && m[1]) return m[1];
                      return name;
                    }
                    return name;
                  })();

                if (attributeTypeID !== undefined && attributeTypeID !== null) {
                  const key =
                    `attributeTypeID_${String(attributeTypeID)}_${String(field)}`.replace(
                      /\s+/g,
                      "_",
                    );
                  transformed[key] = rawValue;
                } else {
                  // No attributeTypeID available - preserve original key
                  transformed[name] = rawValue;
                }
              } catch {
                // ignore per-question transform errors
              }
            }
            completedJsonToSend = transformed;
          }
        } catch (e) {
          console.warn("Failed to transform completed JSON keys:", e);
          completedJsonToSend = sender.data;
        }

        const completedPayload: Record<string, any> =
          completedJsonToSend && typeof completedJsonToSend === "object"
            ? { ...completedJsonToSend }
            : { value: completedJsonToSend };

        completedPayload.__surveyMeta = {
          addedQuestionSets: addedQuestionSetsRef.current,
          possibleQuestionSetCount: possibleQuestionSetCountRef.current,
        };

        const response = await fetch("/api/survey-instance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: instanceId,
            completedJson: completedPayload,
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

  const applyModelUiSettings = useCallback(
    (model: Model) => {
      model.applyTheme(LayeredLight);
      model.showProgressBar = true;
      model.progressBarLocation = "top";
      model.progressBarType = "pages";
      model.progressBarShowPageNumbers = false;
      model.progressBarShowPageTitles = true;
      model.onComplete.add(handleSurveyComplete);
      model.onValueChanged.add(handleMetaChoice as any);

      const modelWithNav = model as any;
      if (typeof modelWithNav.addNavigationItem === "function") {
        const getAddQuestionsNavItem = () => {
          if (typeof modelWithNav.getNavigationItemById === "function") {
            const byMethod = modelWithNav.getNavigationItemById(
              FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID,
            );
            if (byMethod) {
              return byMethod;
            }
          }

          const navBar = modelWithNav.navigationBar;
          if (navBar && typeof navBar.getActionById === "function") {
            const byActionId = navBar.getActionById(
              FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID,
            );
            if (byActionId) {
              return byActionId;
            }
          }

          if (Array.isArray(navBar?.actions)) {
            return (
              navBar.actions.find(
                (action: any) =>
                  action && action.id === FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID,
              ) || null
            );
          }

          return null;
        };

        const syncAddQuestionsNavState = () => {
          const navItem = getAddQuestionsNavItem();
          if (!navItem) {
            return;
          }

          const hasPossibleQuestionSets = possibleQuestionSetCountRef.current > 0;
          const hasAddableQuestionSets = addableQuestionSetTemplatesRef.current.length > 0;

          navItem.visible = model.isCompleteButtonVisible && hasPossibleQuestionSets;
          navItem.enabled = hasAddableQuestionSets;

          if (modelWithNav.navigationBar && typeof modelWithNav.navigationBar.update === "function") {
            modelWithNav.navigationBar.update();
          }

          console.log("[survey-add] Footer nav sync on page change", {
            pageName: model.currentPage?.name,
            isCompleteButtonVisible: model.isCompleteButtonVisible,
            hasPossibleQuestionSets,
            hasAddableQuestionSets,
            visible: navItem.visible,
            enabled: navItem.enabled,
          });
        };

        const existingNavItem = getAddQuestionsNavItem();

        if (!existingNavItem) {
          modelWithNav.addNavigationItem({
            id: FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID,
            title: "Add Questions",
            visibleIndex: 60,
            css: "survey-add-questions-nav-action",
            innerCss: "sd-btn sd-btn--action survey-add-questions-nav-button",
            visible: false,
            enabled: addableQuestionSetTemplatesRef.current.length > 0,
            action: () => {
              console.log("[survey-add] Opening add-questions modal from footer action", {
                pageName: model.currentPage?.name,
                pageNo: model.currentPageNo,
              });
              setShowAddQuestionsModal(true);
            },
          });
        }

        syncAddQuestionsNavState();
        model.onCurrentPageChanged.add(syncAddQuestionsNavState as any);
      }
    },
    [handleSurveyComplete, handleMetaChoice],
  );

  useEffect(() => {
    const activeModel = surveyModelRef.current;
    if (!activeModel) {
      return;
    }

    const modelWithNav = activeModel as any;
    const navBar = modelWithNav.navigationBar;
    const navItem =
      typeof navBar?.getActionById === "function"
        ? navBar.getActionById(FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID)
        : Array.isArray(navBar?.actions)
          ? (navBar.actions.find(
              (action: any) =>
                action && action.id === FINAL_ACTIONS_NAV_ADD_QUESTIONS_ID,
            ) ?? null)
          : null;

    if (!navItem) {
      return;
    }

    const hasPossibleQuestionSets = possibleQuestionSets.length > 0;
    const hasAddableQuestionSets = addableQuestionSetTemplates.length > 0;
    navItem.visible = activeModel.isCompleteButtonVisible && hasPossibleQuestionSets;
    navItem.enabled = hasAddableQuestionSets;

    if (navBar && typeof navBar.update === "function") {
      navBar.update();
    }

    console.log("[survey-add] Synced footer Add Questions visibility", {
      pageName: activeModel.currentPage?.name,
      isCompleteButtonVisible: activeModel.isCompleteButtonVisible,
      hasPossibleQuestionSets,
      hasAddableQuestionSets,
      visible: navItem.visible,
      enabled: navItem.enabled,
    });
  }, [addableQuestionSetTemplates.length, possibleQuestionSets.length, surveyModel]);

  const handleSurveyRenderError = useCallback(
    (renderError: Error) => {
      console.error("Survey render failed", renderError);

      if (
        !compatRenderFallbackApplied &&
        surveyModelRef.current &&
        /inputStringRendered/i.test(String(renderError?.message || ""))
      ) {
        try {
          const fallbackJson: any = surveyModelRef.current.toJSON();
          if (fallbackJson && Array.isArray(fallbackJson.pages)) {
            fallbackJson.pages.forEach((page: any) => {
              if (!Array.isArray(page?.elements)) return;
              page.elements.forEach((element: any) => {
                if (element?.type === "panel" && Array.isArray(element?.elements)) {
                  element.elements.forEach((subElement: any) => {
                    normalizeElementForSurvey(subElement, {
                      forceMetaDropdownToRadio: true,
                      forceAllDropdownToRadio: true,
                    });
                  });
                } else {
                  normalizeElementForSurvey(element, {
                    forceMetaDropdownToRadio: true,
                    forceAllDropdownToRadio: true,
                  });
                }
              });
            });
          }

          if (surveyModelRef.current) {
            try {
              surveyModelRef.current.onComplete.remove(handleSurveyComplete);
            } catch {}
            try {
              surveyModelRef.current.onValueChanged.remove(handleMetaChoice as any);
            } catch {}
            try {
              surveyModelRef.current.dispose();
            } catch {}
          }

          const fallbackModel = new Model(fallbackJson);
          applyModelUiSettings(fallbackModel);
          surveyModelRef.current = fallbackModel;
          setSurveyModel(fallbackModel);
          setCompatRenderFallbackApplied(true);
          setSurveyViewVersion((prev) => prev + 1);
          setError(
            "Loaded in legacy compatibility mode for dropdown rendering.",
          );
          return;
        } catch (fallbackErr) {
          console.error("Compatibility fallback failed", fallbackErr);
        }
      }

      setError(
        renderError?.message || "Failed to render survey due to invalid question data.",
      );
    },
    [
      applyModelUiSettings,
      compatRenderFallbackApplied,
      handleMetaChoice,
      handleSurveyComplete,
    ],
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
        if (typeof surveyJson === "string") {
          try {
            surveyJson = JSON.parse(surveyJson);
          } catch (e) {
            console.warn(
              "fetchInstance - SurveyJSON string parse failed, using raw string",
              e,
            );
          }
        }

        const surveyMeta = surveyJson?.surveyMeta as
          | {
              possibleQuestionSets?: PossibleQuestionSetMetadata[];
            }
          | undefined;
        const possibleFromSurvey = Array.isArray(surveyMeta?.possibleQuestionSets)
          ? surveyMeta.possibleQuestionSets
          : [];
        setPossibleQuestionSets(possibleFromSurvey);
        const forceMetaDropdownToRadio = possibleFromSurvey.length === 0;
        if (possibleFromSurvey.length > 0) {
          ensureFinalActionsPage(surveyJson);
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
            e,
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
                    normalizeElementForSurvey(subElement, {
                      forceMetaDropdownToRadio,
                    });
                    convertImageToFile(subElement);
                  });
                } else {
                  normalizeElementForSurvey(element, {
                    forceMetaDropdownToRadio,
                  });
                  convertImageToFile(element);
                }
              });
            }
          });
        }

        const model = new Model(surveyJson);

        // Load completed data if exists, otherwise use data from surveyJson
        if (instanceData.CompletedJSON) {
          let completedData: any = instanceData.CompletedJSON;
          if (typeof completedData === "string") {
            try {
              completedData = JSON.parse(completedData);
            } catch (e) {
              console.warn(
                "fetchInstance - CompletedJSON string parse failed, using raw value",
                e,
              );
            }
          }

          const restoredAddedQuestionSets = Array.isArray(
            completedData?.__surveyMeta?.addedQuestionSets,
          )
            ? (completedData.__surveyMeta
                .addedQuestionSets as AddedQuestionSetMetadata[])
            : [];

          if (restoredAddedQuestionSets.length > 0) {
            const possibleByKey = new Map(
              possibleFromSurvey.map((set: PossibleQuestionSetMetadata) => [
                set.key,
                set,
              ]),
            );

            for (const restored of restoredAddedQuestionSets) {
              const possibleSet = possibleByKey.get(restored.key);
              if (!possibleSet) continue;

              injectAddedQuestionSetIntoFinalPage(model, possibleSet, restored);
            }
          }

          setAddedQuestionSets(restoredAddedQuestionSets);

          if (completedData && typeof completedData === "object") {
            model.data = completedData;
          } else if (surveyJson.data) {
            model.data = surveyJson.data;
          }
        } else if (surveyJson.data) {
          model.data = surveyJson.data;
          setAddedQuestionSets([]);
        } else {
          setAddedQuestionSets([]);
        }

        // Handle completion and attach meta-choice handler
        applyModelUiSettings(model);

        // If this is a completed survey and meta-questions were answered,
        // programmatically inject their question-sets so the page shows the injected details
        try {
          // Auto-inject meta question-sets for any answered meta questions
          const data = model.data || {};
          const questions = model.getAllQuestions
            ? model.getAllQuestions()
            : [];

          // Keep a copy of original data so we can remap values into injected question names
          const originalData = { ...data };

          for (const q of questions) {
            try {
              const qName = q && q.name;
              if (!qName) continue;
              const val =
                originalData &&
                Object.prototype.hasOwnProperty.call(originalData, qName)
                  ? originalData[qName]
                  : undefined;
              if (val === undefined || val === null || val === "") continue;
              const hasChoices =
                Array.isArray(q.choices) && q.choices.length > 0;
              if (!hasChoices) continue;
              // Inject the question-set for this meta choice
              await (async () =>
                handleMetaChoice(model, { name: qName, value: val }))();
            } catch {
              // ignore per-question injection errors
            }
          }

          // After injection, remap original completed values into injected question names
          try {
            const allQuestionsAfter = model.getAllQuestions
              ? model.getAllQuestions()
              : [];
            const newData: any = { ...originalData };
            for (const q of allQuestionsAfter) {
              try {
                const qName = q && q.name;
                if (!qName) continue;
                // If this question has a declared fieldName (preserved from source), prefer that as original key
                const originalKeyCandidates: string[] = [];
                if (q.fieldName) originalKeyCandidates.push(q.fieldName);
                // Also consider the element's raw name without attributeTypeID prefix
                if (typeof qName === "string") {
                  const m = qName.match(/^attributeTypeID_\d+_(.+)$/);
                  if (m && m[1]) originalKeyCandidates.push(m[1]);
                }
                // Finally, add the qName itself as a fallback
                originalKeyCandidates.push(qName);

                for (const candidate of originalKeyCandidates) {
                  if (
                    candidate &&
                    Object.prototype.hasOwnProperty.call(
                      originalData,
                      candidate,
                    ) &&
                    !Object.prototype.hasOwnProperty.call(newData, qName)
                  ) {
                    newData[qName] = originalData[candidate];
                    break;
                  }
                }
              } catch {}
            }
            // Assign remapped data back to model
            try {
              model.data = newData;
            } catch {
              // fallback: replace values one by one
              for (const k of Object.keys(newData)) {
                try {
                  if (model.setValue) {
                    model.setValue(k, newData[k]);
                  }
                } catch {}
              }
            }
          } catch (e) {
            console.warn(
              "fetchInstance - failed to remap completed data into injected questions",
              e,
            );
          }
        } catch (e) {
          console.warn(
            "fetchInstance - failed to auto-inject meta question-sets for completed survey",
            e,
          );
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
          console.warn("fetchInstance - failed to snapshot model", e);
        }

        surveyModelRef.current = model;
        setSurveyModel(model);
        setCompatRenderFallbackApplied(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [
    instanceId,
    applyModelUiSettings,
    handleMetaChoice,
    ensureFinalActionsPage,
    injectAddedQuestionSetIntoFinalPage,
  ]);

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
          <SurveyRenderBoundary
            resetKey={surveyViewVersion}
            onError={handleSurveyRenderError}
          >
            <Survey key={surveyViewVersion} model={surveyModel} />
          </SurveyRenderBoundary>
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

      {showAddQuestionsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "80vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #ddd",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h2 style={{ margin: 0 }}>Add Question Set</h2>
              <button
                onClick={() => setShowAddQuestionsModal(false)}
                style={{
                  border: "1px solid #bbb",
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <p style={{ marginTop: 0, marginBottom: "16px", color: "#555" }}>
              Select a possible question set to add to the survey.
            </p>

            <div style={{ display: "grid", gap: "10px" }}>
              {addableQuestionSetTemplates.map((questionSet) => {
                const addedCount = addedQuestionSets.filter(
                  (item) => item.key === questionSet.key,
                ).length;

                const previewQuestionTitles = questionSet.questions
                  .slice(0, 3)
                  .map((question) => question.title || question.fieldName)
                  .filter((title) => Boolean(title && title.trim().length > 0));

                return (
                  <div
                    key={questionSet.key}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{questionSet.title}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          {questionSet.questions.length} question
                          {questionSet.questions.length === 1 ? "" : "s"}
                          {addedCount > 0
                            ? ` • added ${addedCount} time(s)`
                            : ""}
                        </div>
                        {previewQuestionTitles.length > 0 && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#4b5563",
                              marginTop: "6px",
                            }}
                          >
                            {previewQuestionTitles.join(" • ")}
                            {questionSet.questions.length >
                            previewQuestionTitles.length
                              ? " • ..."
                              : ""}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddQuestionSet(questionSet)}
                        disabled={addingQuestionSetKey === questionSet.key}
                        style={{
                          border: "1px solid #166534",
                          backgroundColor: "#16a34a",
                          color: "white",
                          borderRadius: "6px",
                          padding: "7px 12px",
                          fontWeight: 600,
                          cursor:
                            addingQuestionSetKey === questionSet.key
                              ? "not-allowed"
                              : "pointer",
                          opacity: addingQuestionSetKey === questionSet.key ? 0.7 : 1,
                        }}
                      >
                        {addingQuestionSetKey === questionSet.key
                          ? "Adding..."
                          : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {addableQuestionSetTemplates.length === 0 && (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "12px",
                    backgroundColor: "#fff",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  No possible question sets are currently available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

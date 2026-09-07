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
  if (element.type === 'image') {
    const isReadOnly = element.readOnly === true;
    
    if (!isReadOnly) {
      // Convert to file type with camera capture
      element.type = 'file';
      element.sourceType = 'file-camera';
      element.acceptedTypes = 'image/*';
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

export default function SurveyInstanceDetailPage() {
  const params = useParams();
  const instanceId = params.id as string;
  
  const [instance, setInstance] = useState<SurveyInstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const surveyModelRef = useRef<Model | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugState, setDebugState] = useState<any>({ messages: [], lastChoice: null, embedded: null, surveyJson: null });

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

      const embedded = choiceObj["meta-contents"] || choiceObj.metaContents || choiceObj.meta_contents || choiceObj.questionSet || choiceObj.questionSetJson || null;
      console.log('meta-choice selected', { name: qName, value: selectedValue, choiceObj, embedded });
      setDebugState((s: any) => ({ ...s, messages: [...s.messages, `meta-choice selected: ${qName}=${String(selectedValue)}`], lastChoice: choiceObj, embedded }));
      if (!embedded) {
        console.log('No embedded meta-contents found on choice, will attempt fallback fetch');
      }
      if (!embedded) return;

      let elems: any[] = [];
      if (typeof embedded === "string") {
        try {
          const parsed = JSON.parse(embedded);
          if (Array.isArray(parsed)) elems = parsed;
          else if (parsed && Array.isArray(parsed.elements)) elems = parsed.elements;
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
              const questionsArray = Array.isArray(qsQuestionsData?.data) ? qsQuestionsData.data : [];

              // Map into elements similar to embedded flow
              const mappedElems = questionsArray.map((q: any, idx: number) => {
                const el: any = {
                  type: (q.displayType && String(q.displayType).toLowerCase().includes('date')) ? 'date' : (q.displayType ? q.displayType : 'text'),
                  name: q.fieldName || `qs_${qsId}_q_${idx}`,
                  title: q.surveyLabel || q.attributeLabel || q.fieldName || `Question ${idx+1}`,
                  choices: (() => {
                    try {
                      if (q.choices && typeof q.choices === 'string') return JSON.parse(q.choices);
                    } catch {}
                    return Array.isArray(q.choices) ? q.choices : undefined;
                  })(),
                  defaultValue: null,
                  isRequired: q.isRequired === true,
                };
                return el;
              });

              if (mappedElems.length > 0) {
                console.log('Fallback fetched question-set mappedElems', mappedElems);
                setDebugState((s: any) => ({ ...s, messages: [...s.messages, `Fetched and mapped ${mappedElems.length} questions for question-set ${qsId}`], lastChoice: choiceObj, embedded: mappedElems }));
                // Inject mapped elements into page
                const page = question.page;
                if (!page) return;
                const panelName = `meta_injected_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                let newPanel: any = null;
                if (typeof page.addNewPanel === 'function') newPanel = page.addNewPanel(panelName);
                mappedElems.forEach((el: any, idx: number) => {
                  const qType = String(el.type || 'text');
                  const qNameLocal = String(el.name || `meta_${panelName}_${idx}`);
                  let newQ: any = null;
                  if (newPanel && typeof newPanel.addNewQuestion === 'function') newQ = newPanel.addNewQuestion(qType, qNameLocal);
                  else if (typeof page.addNewQuestion === 'function') newQ = page.addNewQuestion(qType, qNameLocal);
                  if (!newQ) { page.elements.push(el); return; }
                  newQ.title = el.title;
                  newQ.isRequired = el.isRequired === true;
                  if (Array.isArray(el.choices)) newQ.choices = el.choices;
                  if (el.defaultValue !== undefined) newQ.defaultValue = el.defaultValue;
                });

                try { question.visible = false; } catch {}
                surveyModelRef.current = sender;
                setSurveyModel(sender);
              }
            } catch (err) {
              console.error('Failed to fetch/inject question-set fallback:', err);
            }
          })();
        }
        return;
      }

      const page = question.page;
      if (!page) return;

      const panelName = `meta_injected_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      let newPanel: any = null;
      console.log('Injecting meta elements into page', { panelName, elems });
      setDebugState((s: any) => ({ ...s, messages: [...s.messages, `Injecting ${elems.length} elements into page ${page.name || '<unnamed>'}`] }));
      if (typeof page.addNewPanel === "function") {
        newPanel = page.addNewPanel(panelName);
      } else {
        // ensure elements array exists
        if (!Array.isArray(page.elements)) page.elements = [];
      }

      elems.forEach((el: any, idx: number) => {
        const qType = String(el.type || el.questionType || "text");
        const qNameLocal = String(el.name || el.fieldName || `meta_${panelName}_${idx}`);
        let newQ: any = null;
        if (newPanel && typeof newPanel.addNewQuestion === "function") {
          newQ = newPanel.addNewQuestion(qType, qNameLocal);
        } else if (typeof page.addNewQuestion === "function") {
          newQ = page.addNewQuestion(qType, qNameLocal);
        }

        if (!newQ) {
          // fallback: push raw element to page.elements
          page.elements.push(el);
          return;
        }

        newQ.title = el.title || el.surveyLabel || el.fieldName || qNameLocal;
        newQ.isRequired = el.isRequired === true;
        newQ.readOnly = el.readOnly === true || el.isReadOnly === true;
        if (Array.isArray(el.choices)) newQ.choices = el.choices;
        if (el.defaultValue !== undefined) newQ.defaultValue = el.defaultValue;
      });

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

  const handleSurveyComplete = useCallback(async (sender: Model) => {
    try {
      const response = await fetch("/api/survey-instance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: instanceId,
          completedJson: sender.data,
          completedDate: new Date().toISOString()
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
      alert("Error saving survey: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, [instanceId]);

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
        const surveyJson = JSON.parse(instanceData.SurveyJSON);
        
        // Convert image fields to file type with camera support
        if (surveyJson.pages) {
          surveyJson.pages.forEach((page: any) => {
            if (page.elements) {
              page.elements.forEach((element: any) => {
                // Handle panels (which contain elements)
                if (element.type === 'panel' && element.elements) {
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
          const completedData = JSON.parse(instanceData.CompletedJSON);
          model.data = completedData;
        } else if (surveyJson.data) {
          model.data = surveyJson.data;
        }

        // Handle completion
        model.onComplete.add(handleSurveyComplete);
        // Attach meta-choice handler to inject embedded question-sets
        model.onValueChanged.add(handleMetaChoice as any);

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
          <h1>{instance.TemplateName || 'Survey Instance'}</h1>
          {instance.AddressLine1 && (
            <p>
              {[
                instance.AddressLine1,
                instance.AddressLine2,
                instance.Town,
                instance.PostCode
              ].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px", backgroundColor: "#fee", border: "1px solid #f00", color: "#c00", marginBottom: "20px", borderRadius: "4px" }}>
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
              style={{ padding: '8px 12px', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => {
                // refresh survey JSON snapshot for debug
                const snapshot = surveyModelRef.current ? surveyModelRef.current.toJSON() : null;
                setDebugState((s: any) => ({ ...s, surveyJson: snapshot, messages: [...s.messages, 'Debug snapshot refreshed'] }));
                setShowDebugPanel((v) => !v);
              }}
            >
              {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
          {showDebugPanel && (
            <div style={{ marginTop: 12, padding: 12, background: '#111', color: '#eee', borderRadius: 6, fontSize: 12, lineHeight: 1.4, maxHeight: '40vh', overflow: 'auto' }}>
              <div style={{ marginBottom: 8 }}><strong>Debug Messages</strong></div>
              <div style={{ marginBottom: 8 }}>
                {Array.isArray(debugState.messages) && debugState.messages.length > 0 ? (
                  <ul>
                    {debugState.messages.map((m: any, i: number) => (<li key={i}>{m}</li>))}
                  </ul>
                ) : (<div style={{ color: '#888' }}>No messages</div>)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Last Selected Choice</div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#9cf' }}>{JSON.stringify(debugState.lastChoice, null, 2)}</pre>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Embedded Payload</div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#9cf' }}>{JSON.stringify(debugState.embedded, null, 2)}</pre>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>Survey Model JSON (snapshot)</div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#9cf' }}>{JSON.stringify(debugState.surveyJson, null, 2)}</pre>
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

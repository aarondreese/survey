"use client";

import { useEffect } from "react";

export default function TitleManager() {
  useEffect(() => {
    // Force the title to always be "Dynamic Surveys"
    const targetTitle = "Dynamic Surveys";
    
    // Set initial title
    document.title = targetTitle;
    
    // Create a MutationObserver to watch for title changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target.nodeName === 'TITLE') {
          if (document.title !== targetTitle) {
            document.title = targetTitle;
          }
        }
      });
    });
    
    // Watch for changes to the document title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      observer.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    
    // Also set up an interval as backup
    const interval = setInterval(() => {
      if (document.title !== targetTitle) {
        document.title = targetTitle;
      }
    }, 100);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
}
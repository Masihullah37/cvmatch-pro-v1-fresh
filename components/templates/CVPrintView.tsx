"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import CVRenderer from "./CVRenderer";

interface CVPrintViewProps {
  template: any;
}

const CVPrintView: React.FC<CVPrintViewProps> = ({ template }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [printableTemplate, setPrintableTemplate] = useState(template);

  // Listen for injected data
  useEffect(() => {
    (window as any).__PRINTER_RENDER_READY__ = false;
    const updateRenderReady = () => {
      const content = containerRef.current?.querySelector(
        '[data-testid="cv-content"]'
      ) as HTMLElement | null;
      if (content && content.textContent?.trim().length > 20) {
        (window as any).__PRINTER_RENDER_READY__ = true;
      }
    };

    const observer = new MutationObserver(updateRenderReady);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    const handleDataReady = (e: any) => {
      const injectedData = (window as any).__PRINTER_DATA__;
      if (injectedData) {
        console.log("Injected printer data received:", injectedData);
        setPrintableTemplate({
          ...template,
          templateData: injectedData,
        });
      }
    };
    window.addEventListener("data-ready", handleDataReady);

    const injectedData = (window as any).__PRINTER_DATA__;
    if (injectedData) {
      setPrintableTemplate({
        ...template,
        templateData: injectedData,
      });
    }

    return () => {
      window.removeEventListener("data-ready", handleDataReady);
      observer.disconnect();
    };
  }, [template]);

  // Measure the FULL content size (scroll dimensions) and compute scale
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    // We need the FULL scroll dimensions of the content, not just the viewport
    const el = contentRef.current;

    // Temporarily remove transform to get natural size
    const origTransform = el.style.transform;
    el.style.transform = "none";

    // Use scroll dimensions to get the FULL content size
    const naturalWidth = el.scrollWidth;
    const naturalHeight = el.scrollHeight;

    // Restore transform
    el.style.transform = origTransform;

    // Viewport dimensions (A4 at 96dpi)
    const viewportWidth = 794;
    const viewportHeight = 1123;

    // Calculate uniform scale to fit BOTH dimensions without overflow
    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;
    const uniformScale = Math.min(scaleX, scaleY, 1); // Never scale up

    console.log(`[CVPrintView] natural: ${naturalWidth}x${naturalHeight}, scale: ${uniformScale}`);

    setScale(uniformScale);
  }, [printableTemplate]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: white;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        /* Ensure no extra space in the CV container */
        .cv-printable {
          margin: 0 !important;
          padding: 0 !important;
          background: white;
        }
      `}</style>

      <div
        data-testid="cv-content"
        ref={contentRef}
        className="cv-printable"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `calc(100% / ${scale})`,
          height: `calc(100% / ${scale})`,
          background: "white",
          position: "relative",
          margin: 0,
          padding: 0,
        }}
      >
        <CVRenderer
          template={printableTemplate}
          isPreview={true}
          isPaid={true}
          analysisData={null}
        />
      </div>
    </div>
  );
};

export default CVPrintView;
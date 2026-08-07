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
  const [isLoading, setIsLoading] = useState(true);

  // Inject data and immediately mark as ready when DOM updates
  useEffect(() => {
    const handleDataReady = (e: any) => {
      const injectedData = (window as any).__PRINTER_DATA__;
      if (injectedData) {
        console.log("Injected printer data received:", injectedData);
        setPrintableTemplate({
          ...template,
          templateData: injectedData,
        });
        setIsLoading(false);
      }
    };
    window.addEventListener("data-ready", handleDataReady);

    // Check if data is already available
    const injectedData = (window as any).__PRINTER_DATA__;
    if (injectedData) {
      setPrintableTemplate({
        ...template,
        templateData: injectedData,
      });
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener("data-ready", handleDataReady);
    };
  }, [template]);

  // Measure the FULL content size and compute scale
  useLayoutEffect(() => {
    if (!contentRef.current || isLoading) return;

    const el = contentRef.current;
    const origTransform = el.style.transform;
    el.style.transform = "none";

    let naturalWidth = el.scrollWidth;
    let naturalHeight = el.scrollHeight;

    el.style.transform = origTransform;

    if (naturalWidth === 0 || naturalHeight === 0) {
      console.warn("[CVPrintView] Content measured 0px. Forcing temporary scale 1.");
      setScale(1);
      return;
    }

    const viewportWidth = 794;
    const viewportHeight = 1123;

    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;
    let uniformScale = Math.min(scaleX, scaleY, 1);

    if (uniformScale < 0.1) uniformScale = 0.5;

    console.log(`[CVPrintView] natural: ${naturalWidth}x${naturalHeight}, scale: ${uniformScale}`);
    setScale(uniformScale);
  }, [printableTemplate, isLoading]);

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
        .cv-printable {
          margin: 0 !important;
          padding: 0 !important;
          background: white;
        }
      `}</style>

      {isLoading && (
        <div style={{ position: "absolute", color: "#666", fontFamily: "sans-serif" }}>
          Génération du CV en cours...
        </div>
      )}

      <div
        data-testid="cv-content"
        ref={contentRef}
        className="cv-printable"
        style={{
          transform: `scale(${scale}) translate(-50%, -50%)`,
          transformOrigin: "top left",
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "794px",
          height: "1123px",
          background: "white",
          margin: 0,
          padding: 0,
          visibility: isLoading ? "hidden" : "visible",
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
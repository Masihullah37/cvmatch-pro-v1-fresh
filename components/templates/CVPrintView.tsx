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

  // 🛠️ FIX: Remove the isLoading and window event listeners.
  // If the template prop exists, it's ready to render.

  // Measure the FULL content size and compute scale
  useLayoutEffect(() => {
    if (!contentRef.current || !template) return;

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
  }, [template]);

  // If no template exists yet, show the loading message
  if (!template || !template.templateData) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        color: "#666",
        fontFamily: "sans-serif"
      }}>
        Génération du CV en cours...
      </div>
    );
  }

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
          width: "794px", // Force exact A4 width
          height: "1123px", // Force exact A4 height
          background: "white",
          margin: 0,
          padding: 0,
        }}
      >
        {/* 🛠️ Now this is always rendered safely because 'template' exists */}
        <CVRenderer
          template={template}
          isPreview={true}
          isPaid={true}
          analysisData={null}
        />
      </div>
    </div>
  );
};

export default CVPrintView;
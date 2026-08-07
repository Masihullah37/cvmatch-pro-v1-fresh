"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import CVRenderer from "./CVRenderer";

interface CVPrintViewProps {
  template: any;
}

const CVPrintView: React.FC<CVPrintViewProps> = ({ template }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // 🛠️ FIX: Measure content, but scale UP if it's naturally smaller than A4
  useLayoutEffect(() => {
    if (!contentRef.current || !template) return;

    const el = contentRef.current;
    const origTransform = el.style.transform;
    el.style.transform = "none";

    let naturalWidth = el.scrollWidth;
    let naturalHeight = el.scrollHeight;

    el.style.transform = origTransform;

    // Safety fallback
    if (naturalWidth === 0 || naturalHeight === 0) {
      setScale(1);
      return;
    }

    const viewportWidth = 794;
    const viewportHeight = 1123;

    // Calculate uniform scale to FIT the A4 page perfectly
    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;

    // 🛠️ CRITICAL FIX: We use Math.min to shrink large content, 
    // but we do NOT cap it at 1. We scale UP if the content is smaller than A4.
    let uniformScale = Math.min(scaleX, scaleY);

    // Clamp scale so it's never invisible
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
          // 🛠️ FIX: Render exactly at the calculated size
          transform: `scale(${scale}) translate(-50%, -50%)`,
          transformOrigin: "top left",
          position: "absolute",
          top: "50%",
          left: "50%",
          // 🛠️ FIX: Force the DOM element to be A4 size. 
          // If the content is smaller than A4, it will scale UP to fill the page.
          width: "794px",
          height: "1123px",
          background: "white",
          margin: 0,
          padding: 0,
        }}
      >
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
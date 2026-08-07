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

  // Listen for injected data
  useEffect(() => {
    (window as any).__PRINTER_RENDER_READY__ = false;

    const updateRenderReady = () => {
      const content = containerRef.current?.querySelector(
        '[data-testid="cv-content"]'
      ) as HTMLElement | null;
      if (content && content.textContent?.trim().length > 20) {
        (window as any).__PRINTER_RENDER_READY__ = true;
        setIsLoading(false);
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
      observer.disconnect();
    };
  }, [template]);

  // Measure the FULL content size and compute scale
  useLayoutEffect(() => {
    if (!contentRef.current || isLoading) return;

    const el = contentRef.current;

    // Temporarily remove transform to get natural size
    const origTransform = el.style.transform;
    el.style.transform = "none";

    // Use scroll dimensions to get the FULL content size
    let naturalWidth = el.scrollWidth;
    let naturalHeight = el.scrollHeight;

    // Restore transform
    el.style.transform = origTransform;

    // 🛡️ SAFEGUARD: If content is 0px, force a default size so it doesn't vanish
    if (naturalWidth === 0 || naturalHeight === 0) {
      console.warn("[CVPrintView] Content measured 0px. Forcing temporary scale 1.");
      setScale(1);
      return;
    }

    // Viewport dimensions (A4 at 96dpi)
    const viewportWidth = 794;
    const viewportHeight = 1123;

    // Calculate uniform scale to fit BOTH dimensions without overflow
    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;
    let uniformScale = Math.min(scaleX, scaleY, 1); // Never scale up

    // Fix the "Upper portion invisible" bug: 
    // Do not allow the scale to be so small that it becomes invisible
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

      {/* Show a loading message while waiting for data so it's not a blank screen */}
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
          // 🛠️ FIX: Use center-center transform origin and translate to center it
          // This prevents the top and left edges from being cut off
          transform: `scale(${scale}) translate(-50%, -50%)`,
          transformOrigin: "top left",
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "794px", // Force exact A4 width (simplifies math)
          height: "1123px", // Force exact A4 height
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
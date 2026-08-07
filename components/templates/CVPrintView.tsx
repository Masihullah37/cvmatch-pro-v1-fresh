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

  // Measure natural size and compute uniform scale
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const el = contentRef.current;
    // Remove transform to get natural size
    const origTransform = el.style.transform;
    el.style.transform = "none";
    const rect = el.getBoundingClientRect();
    const naturalWidth = rect.width;
    const naturalHeight = rect.height;
    el.style.transform = origTransform;

    // Viewport dimensions (A4 at 96dpi)
    const viewportWidth = 794;
    const viewportHeight = 1123;

    // Uniform scale: fit both dimensions without overflow
    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;
    const uniformScale = Math.min(scaleX, scaleY); // always ≤ 1

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
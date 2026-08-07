"use client";

import React, { useEffect, useRef, useState } from "react";
import CVRenderer from "./CVRenderer";

interface CVPrintViewProps {
  template: any;
}

const CVPrintView: React.FC<CVPrintViewProps> = ({ template }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // const [scale, setScale] = useState(1);
  const [printableTemplate, setPrintableTemplate] = useState(template);

  useEffect(() => {
    // Prepare a render-ready signal for Puppeteer
    (window as any).__PRINTER_RENDER_READY__ = false;

    const updateRenderReady = () => {
      const content = containerRef.current?.querySelector(
        '[data-testid="cv-content"]',
      ) as HTMLElement | null;
      if (content && content.textContent?.trim().length > 20) {
        (window as any).__PRINTER_RENDER_READY__ = true;
      }
    };

    const observer = new MutationObserver(() => {
      updateRenderReady();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Listen for custom data injection from Puppeteer
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

    // If Puppeteer injected the data before hydration finished, consume it now.
    const injectedData = (window as any).__PRINTER_DATA__;
    if (injectedData) {
      setPrintableTemplate({
        ...template,
        templateData: injectedData,
      });
    }

    // // Dynamic Scaling Logic
    // const adjustScale = () => {
    //   if (!containerRef.current) return;

    //   const content = containerRef.current.querySelector(
    //     '[data-testid="cv-content"]',
    //   ) as HTMLElement;
    //   if (!content) return;

    //   const targetHeight = 1123; // A4 height in px at 96dpi (approx)
    //   const actualHeight = content.scrollHeight;

    //   if (actualHeight > targetHeight) {
    //     const ratio = targetHeight / actualHeight;
    //     // We allow scaling down to 75% to keep readability
    //     const newScale = Math.max(0.75, ratio);
    //     setScale(newScale);
    //     console.log(
    //       `Scaling CV: ${actualHeight}px -> ${targetHeight}px (Ratio: ${newScale})`,
    //     );
    //   }
    // };

    // // Run scaling check after a short delay for fonts to load
    // const timer = setTimeout(adjustScale, 1000);

    return () => {
      window.removeEventListener("data-ready", handleDataReady);
      observer.disconnect();
      // clearTimeout(timer);
    };
  }, [template]);

  return (
    <div
      ref={containerRef}
      className="no-print-bg bg-white min-h-screen flex items-start justify-center overflow-hidden"
    >
      <style>{`
        @page { 
          margin: 0; 
          size: A4; 
        }
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            background: white !important; 
            -webkit-print-color-adjust: exact; 
          }
          .no-print { display: none !important; }
          .no-print-bg { background: white !important; padding: 0 !important; display: block !important; }
          
          .cv-printable {
            width: 210mm !important;
            min-height:297mm !important;
            height:auto !important;
            overflow: visible !important;
            position: relative;
            transform-origin: top center;
          }
          
          /* Prevent section splitting */
          section, div[class*="section"], .experience-item, .education-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Global font tightening for better fit */
          p, li { line-height: 1.3 !important; }
          h1, h2, h3 { margin-bottom: 0.3em !important; }
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
      `}</style>

      {/* <div
        data-testid="cv-content"
        className="cv-printable"
        style={{
          width: "210mm",
          height: "297mm",
          background: "white",
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      > */}

      <div
        data-testid="cv-content"
        className="cv-printable"
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "white",
          position: "relative",
          overflow: "visible",
          // transform: `scale(${scale})`,
          transformOrigin: "top left",
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

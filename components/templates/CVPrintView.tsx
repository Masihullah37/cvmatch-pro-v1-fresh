// "use client";

// import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
// import CVRenderer from "./CVRenderer";

// interface CVPrintViewProps {
//   template: any;
// }

// const CVPrintView: React.FC<CVPrintViewProps> = ({ template }) => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const contentRef = useRef<HTMLDivElement>(null);
//   const [scale, setScale] = useState(1);
//   const [isReady, setIsReady] = useState(false);
//   const [isMeasured, setIsMeasured] = useState(false);

//   // 1. Wait for data, then force a render at A4 width so we can measure accurately
//   useEffect(() => {
//     if (template && template.templateData) {
//       const timer = setTimeout(() => {
//         setIsReady(true);
//       }, 100);
//       return () => clearTimeout(timer);
//     }
//   }, [template]);

//   const MIN_DENSITY = 0.72;   // legibility floor (~11.5px root font) — never go smaller
//   const MAX_DENSITY = 1.0;
//   const TARGET_HEIGHT = 1123; // one A4 page in px

//   useLayoutEffect(() => {
//     if (!isReady || !contentRef.current || isMeasured) return;

//     const el = contentRef.current;
//     let low = MIN_DENSITY;
//     let high = MAX_DENSITY;
//     let best = MIN_DENSITY;

//     // Binary search for the LARGEST density that still fits one page
//     for (let i = 0; i < 8; i++) {
//       const mid = (low + high) / 2;
//       document.documentElement.style.fontSize = `${16 * mid}px`;
//       void el.offsetHeight; // force reflow so scrollHeight is accurate

//       if (el.scrollHeight <= TARGET_HEIGHT) {
//         best = mid;
//         low = mid;   // fits — try to go bigger/more readable
//       } else {
//         high = mid;  // still overflowing — shrink more
//       }
//     }

//     document.documentElement.style.fontSize = `${16 * best}px`;
//     void el.offsetHeight;
//     console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
//     setIsMeasured(true);
//   }, [isReady, isMeasured]);

//   // 2.5. Signal to Puppeteer that the corrected scale has been painted
//   useEffect(() => {
//     if (isMeasured) {
//       document.body.setAttribute("data-pdf-ready", "true");
//     }
//   }, [isMeasured]);

//   // 3. Render the Loading State
//   if (!template || !template.templateData) {
//     return (
//       <div style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         width: "100vw",
//         height: "100vh",
//         color: "#666",
//         fontFamily: "sans-serif"
//       }}>
//         Génération du CV en cours...
//       </div>
//     );
//   }

//   // 4. Render the A4 container
//   return (

//     <div
//       ref={containerRef}
//       style={{
//         width: "100vw",
//         height: "100vh",
//         overflow: "hidden",
//         margin: 0,
//         padding: 0,
//         background: "white",
//         position: "relative",
//       }}
//     >
//       <style>{`
//         html, body {
//           margin: 0 !important;
//           padding: 0 !important;
//           overflow: hidden !important;
//           background: white;
//         }
//         * {
//           -webkit-print-color-adjust: exact !important;
//           print-color-adjust: exact !important;
//           box-sizing: border-box;
//         }
//         .cv-printable {
//           margin: 0 !important;
//           padding: 0 !important;
//           background: white;
//         }
//       `}</style>

//       <div
//         data-testid="cv-content"
//         ref={contentRef}
//         className="cv-printable"

//         style={{
//           width: "794px",
//           background: "white",
//           margin: 0,
//           padding: 0,
//           visibility: isMeasured ? "visible" : "hidden", // hide until fitted, avoids flash of oversized text
//         }}

//       >
//         <CVRenderer
//           template={template}
//           isPreview={true}
//           isPaid={true}
//           analysisData={null}
//         />
//       </div>
//     </div >
//   );
// };

// export default CVPrintView;



"use client";

import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import CVRenderer from "./CVRenderer";

const CVPrintView = ({ template }: { template: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);
  const [scale, setScale] = useState(
    template?.templateData?.displaySettings?.fontScale ?? 1
  );

  // 1. Wait for data, then force a render at A4 width so we can measure accurately
  useEffect(() => {
    if (template && template.templateData) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [template]);

  // 2. Measure real content height, then shrink density only as far as needed
  //    to fit one A4 page — never below the legibility floor, never above the
  //    user's own chosen font size from the editor.
  useLayoutEffect(() => {
    if (!isReady || !contentRef.current || isMeasured) return;

    const el = contentRef.current;
    const userFontScale = template?.templateData?.displaySettings?.fontScale ?? 1;
    const MIN_DENSITY = 0.85;
    const MAX_DENSITY = userFontScale;
    const TARGET_HEIGHT = 1123; // one A4 page in px

    let low = MIN_DENSITY;
    let high = MAX_DENSITY;
    let best = MIN_DENSITY;

    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      (el.style as any).zoom = String(mid);
      void el.offsetHeight; // force reflow so scrollHeight is accurate

      if (el.scrollHeight <= TARGET_HEIGHT) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    (el.style as any).zoom = String(best);
    void el.offsetHeight;

    console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
    setScale(best);
    setIsMeasured(true);
  }, [isReady, isMeasured, template]);

  // 3. Signal to Puppeteer that the final, correctly-sized render is on screen
  useEffect(() => {
    if (isMeasured) {
      document.body.setAttribute("data-pdf-ready", "true");
    }
  }, [isMeasured]);

  // 4. Loading state — shown while template data hasn't arrived yet
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
        Génération du CV en cours…
      </div>
    );
  }

  // 5. A4 container — natural height, no forced single-page clip.
  //    If content still doesn't fit at the legibility floor, it flows onto a
  //    real page 2 instead of being cut off (see route.ts: no pageRanges).
  return (
    <div
      ref={containerRef}
      style={{
        width: "794px",
        margin: "0 auto",
        padding: 0,
        background: "white",
      }}
    >
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
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
          width: "794px",
          background: "white",
          margin: 0,
          padding: 0,
          visibility: isMeasured ? "visible" : "hidden",
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

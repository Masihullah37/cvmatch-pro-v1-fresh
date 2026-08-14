// "use client";

// import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
// import CVRenderer from "./CVRenderer";

// const CVPrintView = ({ template }: { template: any }) => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const contentRef = useRef<HTMLDivElement>(null);

//   const [isReady, setIsReady] = useState(false);
//   const [isMeasured, setIsMeasured] = useState(false);
//   const [scale, setScale] = useState(
//     template?.templateData?.displaySettings?.fontScale ?? 1
//   );

//   // 1. Wait for data, then force a render at A4 width so we can measure accurately
//   useEffect(() => {
//     if (template && template.templateData) {
//       const timer = setTimeout(() => {
//         setIsReady(true);
//       }, 100);
//       return () => clearTimeout(timer);
//     }
//   }, [template]);

//   // 2. Measure real content height, then shrink density only as far as needed
//   //    to fit one A4 page — never below the legibility floor, never above the
//   //    user's own chosen font size from the editor.
//   useLayoutEffect(() => {
//     if (!isReady || !contentRef.current || isMeasured) return;

//     const el = contentRef.current;
//     const userFontScale = template?.templateData?.displaySettings?.fontScale ?? 1;
//     const MIN_DENSITY = 0.85;
//     const MAX_DENSITY = userFontScale;
//     const TARGET_HEIGHT = 1123; // one A4 page in px

//     let low = MIN_DENSITY;
//     let high = MAX_DENSITY;
//     let best = MIN_DENSITY;

//     for (let i = 0; i < 8; i++) {
//       const mid = (low + high) / 2;
//       (el.style as any).zoom = String(mid);
//       void el.offsetHeight; // force reflow so scrollHeight is accurate

//       if (el.scrollHeight <= TARGET_HEIGHT) {
//         best = mid;
//         low = mid;
//       } else {
//         high = mid;
//       }
//     }

//     (el.style as any).zoom = String(best);
//     void el.offsetHeight;

//     console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
//     setScale(best);
//     setIsMeasured(true);
//   }, [isReady, isMeasured, template]);

//   // 3. Signal to Puppeteer that the final, correctly-sized render is on screen
//   useEffect(() => {
//     if (isMeasured) {
//       document.body.setAttribute("data-pdf-ready", "true");
//     }
//   }, [isMeasured]);

//   // 4. Loading state — shown while template data hasn't arrived yet
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
//         Génération du CV en cours…
//       </div>
//     );
//   }

//   // 5. A4 container — natural height, no forced single-page clip.
//   //    If content still doesn't fit at the legibility floor, it flows onto a
//   //    real page 2 instead of being cut off (see route.ts: no pageRanges).
//   return (
//     <div
//       ref={containerRef}
//       style={{
//         width: "794px",
//         margin: "0 auto",
//         padding: 0,
//         background: "white",
//       }}
//     >
//       <style>{`
//         html, body {
//           margin: 0 !important;
//           padding: 0 !important;
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
//           visibility: isMeasured ? "visible" : "hidden",
//         }}
//       >
//         <CVRenderer
//           template={template}
//           isPreview={true}
//           isPaid={true}
//           analysisData={null}
//         />
//       </div>
//     </div>
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

  useEffect(() => {
    if (template && template.templateData) {
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [template]);

  useLayoutEffect(() => {
    if (!isReady || !contentRef.current || isMeasured) return;

    const el = contentRef.current;
    const userFontScale = template?.templateData?.displaySettings?.fontScale ?? 1;
    const MIN_DENSITY = 0.85;
    const MAX_DENSITY = userFontScale;
    const TARGET_HEIGHT = 1123; // one A4 page in px
    const PAGE_WIDTH = 794;

    // Applies zoom AND a compensating width together, so this box's rendered
    // footprint always stays exactly PAGE_WIDTH px — never narrower, whatever
    // the zoom level — which is what eliminates the right-side blank space.
    const applyDensity = (density: number) => {
      el.style.width = `${PAGE_WIDTH / density}px`;
      (el.style as any).zoom = String(density);
      void el.offsetHeight; // force reflow so scrollHeight reads correctly
    };

    // Pass 1: shrink only as far as needed to fit one page
    let low = MIN_DENSITY;
    let high = MAX_DENSITY;
    let best = MIN_DENSITY;

    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      applyDensity(mid);
      if (el.scrollHeight <= TARGET_HEIGHT) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
    applyDensity(best);

    // Pass 2: if content fits with room to spare, grow back up to fill the
    // page instead of leaving blank space — capped at 1.15 like the slider.
    const FILL_CEILING = 1.15;
    if (best < FILL_CEILING) {
      let fillLow = best;
      let fillHigh = FILL_CEILING;
      let fillBest = best;
      for (let i = 0; i < 6; i++) {
        const mid = (fillLow + fillHigh) / 2;
        applyDensity(mid);
        if (el.scrollHeight <= TARGET_HEIGHT) {
          fillBest = mid;
          fillLow = mid;
        } else {
          fillHigh = mid;
        }
      }
      best = fillBest;
      applyDensity(best);
    }

    console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
    setIsMeasured(true);
  }, [isReady, isMeasured, template]);

  useEffect(() => {
    if (isMeasured) {
      document.body.setAttribute("data-pdf-ready", "true");
    }
  }, [isMeasured]);

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

  return (
    <div
      ref={containerRef}
      style={{ width: "794px", margin: "0 auto", padding: 0, background: "white" }}
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
          applyDisplayZoom={false}
        />
      </div>
    </div>
  );
};

export default CVPrintView;

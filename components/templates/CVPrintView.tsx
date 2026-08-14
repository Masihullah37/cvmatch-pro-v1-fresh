// "use client";

// import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
// import CVRenderer from "./CVRenderer";

// const CVPrintView = ({ template }: { template: any }) => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const contentRef = useRef<HTMLDivElement>(null);

//   const [isReady, setIsReady] = useState(false);
//   const [isMeasured, setIsMeasured] = useState(false);

//   useEffect(() => {
//     if (template && template.templateData) {
//       const timer = setTimeout(() => setIsReady(true), 100);
//       return () => clearTimeout(timer);
//     }
//   }, [template]);

//   useLayoutEffect(() => {
//     if (!isReady || !contentRef.current || isMeasured) return;

//     const el = contentRef.current;
//     const userFontScale = template?.templateData?.displaySettings?.fontScale ?? 1;
//     const MIN_DENSITY = 0.85;
//     const MAX_DENSITY = userFontScale;
//     const TARGET_HEIGHT = 1123; // one A4 page in px
//     const PAGE_WIDTH = 794;

//     // Applies zoom AND a compensating width together, so this box's rendered
//     // footprint always stays exactly PAGE_WIDTH px — never narrower, whatever
//     // the zoom level — which is what eliminates the right-side blank space.
//     const applyDensity = (density: number) => {
//       el.style.width = `${PAGE_WIDTH / density}px`;
//       (el.style as any).zoom = String(density);
//       void el.offsetHeight; // force reflow so scrollHeight reads correctly
//     };

//     // Pass 1: shrink only as far as needed to fit one page
//     let low = MIN_DENSITY;
//     let high = MAX_DENSITY;
//     let best = MIN_DENSITY;

//     for (let i = 0; i < 8; i++) {
//       const mid = (low + high) / 2;
//       applyDensity(mid);
//       if (el.scrollHeight <= TARGET_HEIGHT) {
//         best = mid;
//         low = mid;
//       } else {
//         high = mid;
//       }
//     }
//     applyDensity(best);

//     // Pass 2: if content fits with room to spare, grow back up to fill the
//     // page instead of leaving blank space — capped at 1.15 like the slider.
//     const FILL_CEILING = 1.15;
//     if (best < FILL_CEILING) {
//       let fillLow = best;
//       let fillHigh = FILL_CEILING;
//       let fillBest = best;
//       for (let i = 0; i < 6; i++) {
//         const mid = (fillLow + fillHigh) / 2;
//         applyDensity(mid);
//         if (el.scrollHeight <= TARGET_HEIGHT) {
//           fillBest = mid;
//           fillLow = mid;
//         } else {
//           fillHigh = mid;
//         }
//       }
//       best = fillBest;
//       applyDensity(best);
//     }

//     console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
//     setIsMeasured(true);
//   }, [isReady, isMeasured, template]);

//   useEffect(() => {
//     if (isMeasured) {
//       document.body.setAttribute("data-pdf-ready", "true");
//     }
//   }, [isMeasured]);

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

//   return (
//     <div
//       ref={containerRef}
//       style={{ width: "794px", margin: "0 auto", padding: 0, background: "white" }}
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
//           applyDisplayZoom={false}
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

    const userFontScale =
      template?.templateData?.displaySettings?.fontScale ?? 1;

    const MIN_DENSITY = 0.85;
    const MAX_DENSITY = userFontScale;

    // A4 height is approximately 1122.5px at 96 DPI.
    // Keep a 4.5px safety buffer to prevent sub-pixel rounding from
    // accidentally creating an additional PDF page.
    const TARGET_HEIGHT = 1118;

    const PAGE_WIDTH = 794;

    // Applies zoom and compensating width together so the rendered
    // footprint remains exactly PAGE_WIDTH px at every density.
    const applyDensity = (density: number) => {
      el.style.width = `${PAGE_WIDTH / density}px`;
      (el.style as any).zoom = String(density);

      // Force layout/reflow so scrollHeight is measured after zoom changes.
      void el.offsetHeight;
    };

    /*
     * Pass 1:
     * Find the largest density that allows the content to fit on one page.
     *
     * If the content cannot fit even at MIN_DENSITY, the binary search
     * naturally leaves us at MIN_DENSITY and the CV is allowed to flow
     * onto multiple pages.
     */
    let low = MIN_DENSITY;
    let high = Math.max(MIN_DENSITY, MAX_DENSITY);
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

    /*
     * Pass 2:
     * If the CV fits on one page, grow the density back up so the page
     * is used efficiently instead of leaving excessive blank space.
     *
     * The maximum remains 1.15, matching the supported font-scale range.
     *
     * If the CV requires multiple pages, this pass does not force it to
     * fit onto one page; the readable MIN_DENSITY is preserved and the
     * content is allowed to flow naturally across pages.
     */
    const FILL_CEILING = 1.15;

    if (el.scrollHeight <= TARGET_HEIGHT && best < FILL_CEILING) {
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

    console.log(
      `[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`
    );

    setIsMeasured(true);
  }, [isReady, isMeasured, template]);

  useEffect(() => {
    if (isMeasured) {
      document.body.setAttribute("data-pdf-ready", "true");
    }

    return () => {
      document.body.removeAttribute("data-pdf-ready");
    };
  }, [isMeasured]);

  if (!template || !template.templateData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
          color: "#666",
          fontFamily: "sans-serif",
        }}
      >
        Génération du CV en cours…
      </div>
    );
  }

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
      <style>
        {`
          @page {
            size: A4;
            margin: 12mm 0 12mm 0;
          }

          html,
          body {
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

          .cv-printable .flex {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          /* Keep section titles together with the first line of content */
          .cv-printable h1,
          .cv-printable h2,
          .cv-printable h3,
          .cv-printable h4 {
            break-after: avoid-page;
            page-break-after: avoid;
          }

          /* Keep individual items together, while allowing sections to split cleanly */
          .cv-printable .break-inside-avoid-page,
          .cv-printable [data-cv-item] {
            break-inside: avoid-page;
            page-break-inside: avoid;
          }

          @media print {
            html,
            body {
              width: 100%;
              height: auto;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            .cv-printable {
              break-inside: auto;
              page-break-inside: auto;
            }

            .cv-printable .flex {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .cv-printable h1,
            .cv-printable h2,
            .cv-printable h3,
            .cv-printable h4 {
              break-after: avoid-page;
              page-break-after: avoid;
            }

            .cv-printable .break-inside-avoid-page,
            .cv-printable [data-cv-item] {
              break-inside: avoid-page;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div
        data-testid="cv-content"
        ref={contentRef}
        className="cv-printable"
        style={{
          width: "794px",
          minHeight: 0,
          maxHeight: "none",
          height: "auto",
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

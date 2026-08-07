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

//   // 1. Wait for data, then allow rendering at natural size
//   useEffect(() => {
//     if (template && template.templateData) {
//       // Slight delay to let React paint the content at 100% width first
//       const timer = setTimeout(() => {
//         setIsReady(true);
//       }, 50);
//       return () => clearTimeout(timer);
//     }
//   }, [template]);

//   // 2. Measure and scale ONLY AFTER natural render is complete
//   useLayoutEffect(() => {
//     if (!isReady || !contentRef.current) return;

//     const el = contentRef.current;

//     // We no longer need to remove transform, because we haven't applied one yet!
//     // We measure the FULL natural scroll size
//     const naturalWidth = el.scrollWidth;
//     const naturalHeight = el.scrollHeight;

//     if (naturalWidth === 0 || naturalHeight === 0) {
//       setScale(1);
//       return;
//     }

//     // Target A4 size in pixels
//     const viewportWidth = 794;
//     const viewportHeight = 1123;

//     // Compute scale to fill the page exactly
//     const scaleX = viewportWidth / naturalWidth;
//     const scaleY = viewportHeight / naturalHeight;

//     // Allow scaling up!
//     let uniformScale = Math.min(scaleX, scaleY);

//     if (uniformScale < 0.1) uniformScale = 0.5; // Safety fallback

//     console.log(`[CVPrintView] Measured natural: ${naturalWidth}x${naturalHeight}, Applying scale: ${uniformScale}`);
//     setScale(uniformScale);
//   }, [isReady]);

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
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
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

//       {/* 
//         5. 🛠️ KEY FIXES HERE:
//            - Width/Height are set to 'auto' so the inner CVRenderer dictates the size.
//            - Transform is ONLY applied after we render the content at 100%.
//            - Centering is done via the wrapper div (flexbox), not transform hackery.
//       */}
//       <div
//         data-testid="cv-content"
//         ref={contentRef}
//         className="cv-printable"
//         style={{
//           transform: isReady ? `scale(${scale})` : "none",
//           transformOrigin: "top left",
//           // If not ready yet, render at 100% natural width to be measured.
//           width: isReady ? "794px" : "auto",
//           height: isReady ? "1123px" : "auto",
//           background: "white",
//           margin: 0,
//           padding: 0,
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




//2nd version//

"use client";

import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import CVRenderer from "./CVRenderer";

interface CVPrintViewProps {
  template: any;
}

const CVPrintView: React.FC<CVPrintViewProps> = ({ template }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // 1. Wait for data, then force a render at A4 width so we can measure accurately
  useEffect(() => {
    if (template && template.templateData) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [template]);

  // 2. Measure and scale ONLY AFTER natural render is complete
  useLayoutEffect(() => {
    if (!isReady || !contentRef.current) return;

    const el = contentRef.current;

    // We measure the FULL natural scroll size
    // By now, isReady forced the width to 794px in the CSS below
    const naturalWidth = el.scrollWidth;
    const naturalHeight = el.scrollHeight;

    if (naturalWidth === 0 || naturalHeight === 0) {
      setScale(1);
      return;
    }

    // Target A4 size in pixels
    const viewportWidth = 794;
    const viewportHeight = 1123;

    // 🛠️ CRITICAL FIX: Because we forced the HTML width to 794px, 
    // scaleX will be exactly 1.0 (or very close to it).
    // We just need to scale HEIGHT to perfectly fill the vertical space.
    const scaleX = viewportWidth / naturalWidth;
    const scaleY = viewportHeight / naturalHeight;

    // Use Math.min to ensure we never overflow the page
    let uniformScale = Math.min(scaleX, scaleY);

    if (uniformScale < 0.1) uniformScale = 1.0; // Safety fallback

    console.log(`[CVPrintView] Measured natural: ${naturalWidth}x${naturalHeight}, Applying scale: ${uniformScale}`);
    setScale(uniformScale);
  }, [isReady]);

  // 3. Render the Loading State
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

  // 4. Render the A4 container
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

      {/* 
        5. 🛠️ KEY FIX FOR BLANK SPACE:
           - We now force the width to EXACTLY 794px and height to auto on the first render.
           - This prevents the browser from using a standard 960px width.
      */}
      <div
        data-testid="cv-content"
        ref={contentRef}
        className="cv-printable"
        style={{
          transform: isReady ? `scale(${scale})` : "none",
          transformOrigin: "top left",
          // 🛠️ Force width to A4. Let height be auto so it measures the whole document.
          width: "794px",
          height: isReady ? "1123px" : "auto",
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


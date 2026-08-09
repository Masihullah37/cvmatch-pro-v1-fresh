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
  const [isMeasured, setIsMeasured] = useState(false);

  // 1. Wait for data, then force a render at A4 width so we can measure accurately
  useEffect(() => {
    if (template && template.templateData) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [template]);


  // useLayoutEffect(() => {
  //   if (!isReady || !contentRef.current || isMeasured) return;

  //   const el = contentRef.current;
  //   const naturalWidth = el.scrollWidth;
  //   const naturalHeight = el.scrollHeight;

  //   if (naturalWidth === 0 || naturalHeight === 0) {
  //     setScale(1);
  //     setIsMeasured(true);
  //     return;
  //   }

  //   const viewportWidth = 794;
  //   const viewportHeight = 1123;

  //   const scaleX = viewportWidth / naturalWidth;
  //   const scaleY = viewportHeight / naturalHeight;

  //   // Cap at 1 so short CVs never get upscaled/blurry
  //   let uniformScale = Math.min(scaleX, scaleY, 1);

  //   if (uniformScale < 0.1) uniformScale = 1.0;

  //   console.log(`[CVPrintView] Measured natural: ${naturalWidth}x${naturalHeight}, Applying scale: ${uniformScale}`);
  //   setScale(uniformScale);
  //   setIsMeasured(true);
  // }, [isReady, isMeasured]);

  const MIN_DENSITY = 0.72;   // legibility floor (~11.5px root font) — never go smaller
  const MAX_DENSITY = 1.0;
  const TARGET_HEIGHT = 1123; // one A4 page in px

  useLayoutEffect(() => {
    if (!isReady || !contentRef.current || isMeasured) return;

    const el = contentRef.current;
    let low = MIN_DENSITY;
    let high = MAX_DENSITY;
    let best = MIN_DENSITY;

    // Binary search for the LARGEST density that still fits one page
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      document.documentElement.style.fontSize = `${16 * mid}px`;
      void el.offsetHeight; // force reflow so scrollHeight is accurate

      if (el.scrollHeight <= TARGET_HEIGHT) {
        best = mid;
        low = mid;   // fits — try to go bigger/more readable
      } else {
        high = mid;  // still overflowing — shrink more
      }
    }

    document.documentElement.style.fontSize = `${16 * best}px`;
    void el.offsetHeight;
    console.log(`[CVPrintView] density=${best.toFixed(3)} finalHeight=${el.scrollHeight}`);
    setIsMeasured(true);
  }, [isReady, isMeasured]);

  // 2.5. Signal to Puppeteer that the corrected scale has been painted
  useEffect(() => {
    if (isMeasured) {
      document.body.setAttribute("data-pdf-ready", "true");
    }
  }, [isMeasured]);

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
    // <div
    //   ref={containerRef}
    //   style={{
    //     width: "100vw",
    //     height: "100vh",
    //     overflow: "hidden",
    //     margin: 0,
    //     padding: 0,
    //     background: "white",
    //     display: "flex",
    //     alignItems: "center",
    //     justifyContent: "center",
    //   }}
    // >

    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        background: "white",
        position: "relative",
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
      {/* <div
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
      > */}

      <div
        data-testid="cv-content"
        ref={contentRef}
        className="cv-printable"
        // style={{
        //   position: "absolute",
        //   top: 0,
        //   left: 0,
        //   transform: isReady ? `scale(${scale})` : "none",
        //   transformOrigin: "top left",
        //   width: "794px",
        //   height: isReady ? "1123px" : "auto",
        //   background: "white",
        //   margin: 0,
        //   padding: 0,
        // }}

        // style={{
        //   position: "absolute",
        //   top: isReady ? `${(1123 * (1 - scale)) / 2}px` : 0,
        //   left: isReady ? `${(794 * (1 - scale)) / 2}px` : 0,
        //   transform: isReady ? `scale(${scale})` : "none",
        //   transformOrigin: "top left",
        //   width: "794px",
        //   height: isReady ? "1123px" : "auto",
        //   background: "white",
        //   margin: 0,
        //   padding: 0,
        // }}

        style={{
          width: "794px",
          background: "white",
          margin: 0,
          padding: 0,
          visibility: isMeasured ? "visible" : "hidden", // hide until fitted, avoids flash of oversized text
        }}

      >
        <CVRenderer
          template={template}
          isPreview={true}
          isPaid={true}
          analysisData={null}
        />
      </div>
    </div >
  );
};

export default CVPrintView;





// 'use client';

// import { useEffect, useState } from 'react';

// export default function ATSScoreCard({ score }: { score: number }) {
//   const [animated, setAnimated] = useState(0);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       let start = 0;
//       const step = () => {
//         start += 2;
//         setAnimated(Math.min(start, score));
//         if (start < score) requestAnimationFrame(step);
//       };
//       requestAnimationFrame(step);
//     }, 300);
//     return () => clearTimeout(timer);
//   }, [score]);

//   const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
//   const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Moyen' : 'Critique';
//   const circumference = 2 * Math.PI * 54;
//   const offset = circumference - (animated / 100) * circumference;

//   return (
//     <div className="text-center space-y-4">
//       <p className="text-xs font-black uppercase tracking-widest text-slate-400">Score ATS Global</p>
//       <div className="relative w-36 h-36 mx-auto">
//         <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
//           <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="10" />
//           <circle
//             cx="60" cy="60" r="54" fill="none"
//             stroke={color} strokeWidth="10"
//             strokeLinecap="round"
//             strokeDasharray={circumference}
//             strokeDashoffset={offset}
//             style={{ transition: 'stroke-dashoffset 0.05s linear' }}
//           />
//         </svg>
//         <div className="absolute inset-0 flex flex-col items-center justify-center">
//           <span className="text-4xl font-black text-slate-900" style={{ color }}>{animated}</span>
//           <span className="text-xs text-slate-400 font-bold">/ 100</span>
//         </div>
//       </div>
//       <div
//         className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
//         style={{ background: `${color}15`, color }}
//       >
//         {label}
//       </div>
//     </div>
//   );
// }



'use client';

import { useEffect, useState } from 'react';

export default function ATSScoreCard({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);

  // useEffect(() => {
  //   // 1. On s'assure de partir de 0 à chaque fois que le score change
  //   setAnimated(0);

  //   let animationFrameId: number;
  //   let start = 0;
  //   const targetScore = Number(score ?? 0);

  //   const step = () => {
  //     // On augmente de 2 à chaque frame
  //     start += 2;

  //     if (start >= targetScore) {
  //       setAnimated(targetScore); // On force la valeur exacte à la fin
  //     } else {
  //       setAnimated(start);
  //       animationFrameId = requestAnimationFrame(step); // On planifie le prochain frame
  //     }
  //   };

  //   // On lance l'animation après un léger délai de 300ms pour l'effet visuel
  //   const timer = setTimeout(() => {
  //     animationFrameId = requestAnimationFrame(step);
  //   }, 300);

  //   // 2. NETTOYAGE CRUCIAL : On annule le timer ET le frame d'animation si le composant est démonté
  //   return () => {
  //     clearTimeout(timer);
  //     if (animationFrameId) {
  //       cancelAnimationFrame(animationFrameId);
  //     }
  //   };
  // }, [score]);

  useEffect(() => {
    setAnimated(0);

    const target = Math.max(0, Math.round(Number(score || 0)));

    let animationFrame: number;
    let timer: ReturnType<typeof setTimeout>;

    let current = 0;

    const step = () => {
      current += 2;

      if (current >= target) {
        setAnimated(target);
        return;
      }

      setAnimated(current);
      animationFrame = requestAnimationFrame(step);
    };

    timer = setTimeout(() => {
      animationFrame = requestAnimationFrame(step);
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, [score]);

  // const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  // const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Moyen' : 'Critique';
  // const circumference = 2 * Math.PI * 54;
  // const offset = circumference - (animated / 100) * circumference;

  // Use score (not animated) for color/label so they never mismatch
  // Use animated only for the visual counter and circle progress
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  const color = safeScore >= 70 ? '#10b981' : safeScore >= 40 ? '#f59e0b' : '#ef4444';
  const label = safeScore >= 70 ? 'Excellent' : safeScore >= 40 ? 'Moyen' : 'Critique';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="text-center space-y-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Score ATS Global</p>
      <div className="relative w-36 h-36 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* <span className="text-4xl font-black text-slate-900" style={{ color }}>{animated}</span> */}
          <span className="text-4xl font-black text-slate-900" style={{ color }}>{animated === 0 && safeScore > 0 ? safeScore : animated}</span>
          <span className="text-xs text-slate-400 font-bold">/ 100</span>
        </div>
      </div>
      <div
        className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
        style={{ background: `${color}15`, color }}
      >
        {label}
      </div>
    </div>
  );
}
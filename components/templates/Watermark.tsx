

export default function Watermark() {
  return (
    <div className="absolute -inset-x-1/2 -inset-y-1/2 pointer-events-none overflow-hidden select-none z-[50] opacity-[0.08] flex flex-col items-center justify-center rotate-[-35deg] scale-150">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="flex gap-20 whitespace-nowrap mb-20">
          {Array.from({ length: 5 }).map((_, j) => (
            <span key={j} className="text-6xl font-black tracking-[1em] text-black">
              PREVIEW - SUBSCRIBE TO DOWNLOAD - CVMATCH PRO - PREVIEW
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

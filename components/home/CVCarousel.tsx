'use client';

import Image from 'next/image';

const MOCK_CVS = [
  { id: 1, src: '/cv-mocks/mock-cv-1.jpg', style: 'Galaxy', color: '#4f46e5' },
  { id: 2, src: '/cv-mocks/mock-cv-2.jpg', style: 'Eclipse', color: '#1e293b' },
  { id: 3, src: '/cv-mocks/mock-cv-3.jpg', style: 'Europass', color: '#0065a2' },
  { id: 4, src: '/cv-mocks/mock-cv-4.jpg', style: 'Solar', color: '#d97706' },
  { id: 5, src: '/cv-mocks/mock-cv-5.jpg', style: 'Nebula', color: '#e11d48' },
  { id: 6, src: '/cv-mocks/mock-cv-6.jpg', style: 'Stellar', color: '#7c3aed' },
  { id: 7, src: '/cv-mocks/mock-cv-7.jpg', style: 'Hyperion', color: '#059669' },
  { id: 8, src: '/cv-mocks/mock-cv-8.jpg', style: 'Aether', color: '#475569' },
  { id: 9, src: '/cv-mocks/mock-cv-9.jpg', style: 'Cosmos', color: '#0f172a' },
  { id: 10, src: '/cv-mocks/mock-cv-10.jpg', style: 'Lunar', color: '#0284c7' },
];

const ALL_CVS = [...MOCK_CVS, ...MOCK_CVS];

interface CVCarouselProps {
  theme?: 'dark' | 'light';
}

export default function CVCarousel({ theme = 'dark' }: CVCarouselProps) {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#020617' : 'transparent';
  const textColor = isDark ? 'white' : '#0f172a';
  const subTextColor = isDark ? '#64748b' : '#64748b';
  const badgeBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const badgeBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const accentColor = 'hsl(142, 71%, 45%)'; // Emerald Green

  return (
    <section style={{ padding: '35px 0', background: bgColor, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 56px', textAlign: 'center' }}>
        <div
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6"
          style={{
            padding: '8px 16px',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            borderRadius: 999,
            color: subTextColor,
          }}
        >
          ✦ Vos modèles de CV
        </div>
        <h2
          className="font-black tracking-tight"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: textColor, marginBottom: 16, lineHeight: 1.1 }}
        >
          Des designs professionnels,{' '}
          <span style={{ color: accentColor }}>optimisés pour vous</span>
        </h2>
        <p style={{ color: subTextColor, fontSize: 18, maxWidth: 480, margin: '0 auto', fontWeight: 500 }}>
          Chaque CV est généré avec votre contenu, adapté au poste, et prêt à être téléchargé.
        </p>
      </div>

      {/* Carousel */}
      <div style={{ position: 'relative' }}>
        {/* Fades */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 120,
          background: `linear-gradient(to right, ${isDark ? '#020617' : 'var(--background)'}, transparent)`,
          zIndex: 10, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
          background: `linear-gradient(to left, ${isDark ? '#020617' : 'var(--background)'}, transparent)`,
          zIndex: 10, pointerEvents: 'none',
        }} />

        {/* Track */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            width: 'max-content',
            animation: 'carouselScroll 25s linear infinite',
          }}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {ALL_CVS.map((cv, i) => (
            <div
              key={`${cv.id}-${i}`}
              style={{ flexShrink: 0, width: 200, cursor: 'pointer' }}
              className="group"
            >
              <div
                style={{
                  borderRadius: 24,
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  background: isDark
                    ? `linear-gradient(135deg, ${cv.color}33, ${cv.color}11)`
                    : `white`,
                  transition: 'transform 0.3s ease, border-color 0.3s ease',
                  boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05) translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = accentColor;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1) translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ padding: 10 }}>
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    overflow: 'hidden',
                    aspectRatio: '210/297',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    position: 'relative',
                  }}>
                    <Image
                      src={cv.src}
                      alt={`CV ${cv.style}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                </div>
                <div style={{ padding: '8px 12px 12px', textAlign: 'center' }}>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes carouselScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
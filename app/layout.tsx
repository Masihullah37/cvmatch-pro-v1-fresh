import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import Script from 'next/script';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const consent = cookieStore.get('cookie_consent')?.value;

  return (
    <ClerkProvider
      afterSignOutUrl="/fr"
      appearance={{
        // 🌟 Map variables directly onto the CSS tokens Tailwind v4 extracted from your root file
        variables: {
          colorPrimary: '#059669',       // Matches emerald-600
          colorTextBase: '#020617',       // Matches slate-950
          colorTextSecondary: '#64748b',  // Matches slate-500
          colorBackground: '#ffffff',
          borderRadius: '1rem'
        },
        layout: {
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
          shimmer: false,
        }
      }}
    >
      <html lang="fr" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          {consent === 'accepted' && (
            <>
              <Script src="https://www.googletagmanager.com/gtag/js?id=G-PLACEHOLDER" strategy="afterInteractive" />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-PLACEHOLDER');
                `}
              </Script>
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
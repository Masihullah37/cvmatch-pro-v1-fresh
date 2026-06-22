// import { ReactNode } from 'react';
// import { Inter } from 'next/font/google';
// import './globals.css';
// import { cookies } from 'next/headers';
// import Script from 'next/script';

// const inter = Inter({ subsets: ['latin'] });

// import { ClerkProvider } from '@clerk/nextjs'

// export default async function RootLayout({ children }: { children: ReactNode }) {
//   const cookieStore = await cookies();
//   const consent = cookieStore.get('cookie_consent')?.value;

//   return (
//     <ClerkProvider>
//       <html lang="fr" suppressHydrationWarning>
//         <body className={inter.className}>
//           {children}
//           {consent === 'accepted' && (
//             <>
//               <Script src="https://www.googletagmanager.com/gtag/js?id=G-PLACEHOLDER" strategy="afterInteractive" />
//               <Script id="google-analytics" strategy="afterInteractive">
//                 {`
//                   window.dataLayer = window.dataLayer || [];
//                   function gtag(){dataLayer.push(arguments);}
//                   gtag('js', new Date());
//                   gtag('config', 'G-PLACEHOLDER');
//                 `}
//               </Script>
//             </>
//           )}
//         </body>
//       </html>
//     </ClerkProvider>
//   );
// }


import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

import { ClerkProvider } from '@clerk/nextjs'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const consent = cookieStore.get('cookie_consent')?.value;

  return (
    // Explicitly routing the redirect path prevents Next.js RSC payload i18n crashes
    <ClerkProvider afterSignOutUrl="/fr">
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
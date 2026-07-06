// 'use client';

// import Link from 'next/link';
// import { useLocale } from 'next-intl';
// import { Mail, ShieldCheck, CreditCard } from 'lucide-react';
// import Image from 'next/image';

// export default function Footer() {
//   const locale = useLocale();
//   const year = new Date().getFullYear();
//   // const COMPANY_NAME = "OuiCV";

//   return (
//     <footer className="bg-slate-950 border-t border-slate-800/50">
//       <div className="max-w-7xl mx-auto px-3 py-2 md:py-7">

//         {/* Main row */}
//         {/* <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8"> */}
//         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">

//           {/* Brand */}

//           <Link
//             href={`/${locale}`}
//             className="flex items-center shrink-0"
//             aria-label="Retour à l'accueil"
//           >
//             <Image
//               src="/ouicvlogo.png"
//               alt="OuiCV"
//               width={120}
//               height={40}
//               className="w-[120px] md:w-[135px] h-auto object-contain transition-opacity hover:opacity-90"
//               priority
//             />
//           </Link>

//           <nav className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-400">
//             <Link
//               href={`/${locale}`}
//               className="hover:text-white transition-colors"
//             >
//               Accueil
//             </Link>

//             <Link
//               href={`/${locale}#pricing`}
//               className="hover:text-white transition-colors"
//             >
//               Tarifs
//             </Link>

//             <Link
//               href={`/${locale}/conditions-generales`}
//               className="hover:text-white transition-colors"
//             >
//               Conditions générales
//             </Link>

//             <Link
//               href={`/${locale}/mentions-legales`}
//               className="hover:text-white transition-colors"
//             >
//               Mentions légales
//             </Link>

//             <Link
//               href={`/${locale}/politique-confidentialite`}
//               className="hover:text-white transition-colors"
//             >
//               Politique de confidentialité
//             </Link>

//             <Link
//               href={`/${locale}/politique-cookies`}
//               className="hover:text-white transition-colors"
//             >
//               Politique des cookies
//             </Link>
//           </nav>

//           {/* Contact */}
//           <a
//             href="mailto:contact@ouicv.fr"
//             className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors shrink-0 break-all"
//           >
//             <Mail size={14} className="text-primary" />
//             contact@ouicv.fr
//           </a>
//         </div>

//         {/* Divider */}
//         <div className="border-t border-slate-800/50 mt-5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
//           <div className="text-[11px] text-slate-600 leading-5">
//             <p>© {year} OuiCV. Tous droits réservés.</p>

//             <p>
//               Entreprise immatriculée en France • SIRET XXXXX XXXXX XXXXX
//             </p>
//           </div>
//           <div className="flex flex-wrap items-center justify-center gap-3">
//             <div className="flex items-center gap-1.5 text-xs text-slate-600">
//               <ShieldCheck size={12} className="text-emerald-500" />
//               Stripe SSL 256-bit
//             </div>
//             <div className="flex items-center gap-1.5 text-xs text-slate-600">
//               <CreditCard size={12} />
//               Visa · Mastercard · Apple Pay
//             </div>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }



'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Mail, ShieldCheck, CreditCard } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  const locale = useLocale();
  const year = new Date().getFullYear();
  // const COMPANY_NAME = "OuiCV";

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-3 py-2 md:py-7">

        {/* Main row */}
        {/* <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8"> */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">

          {/* Brand */}

          <Link
            href={`/${locale}`}
            className="flex items-center shrink-0"
            aria-label="Retour à l'accueil"
          >
            <Image
              src="/ouicvlogo.png"
              alt="OuiCV"
              width={120}
              height={40}
              className="w-[120px] md:w-[135px] h-auto object-contain transition-opacity hover:opacity-90"
              priority
            />
          </Link>

          <nav className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-400">
            <Link
              href={`/${locale}`}
              className="hover:text-white transition-colors"
            >
              Accueil
            </Link>

            <Link
              href={`/${locale}#pricing`}
              className="hover:text-white transition-colors"
            >
              Tarifs
            </Link>

            <Link
              href={`/${locale}/conditions-generales`}
              className="hover:text-white transition-colors"
            >
              Conditions générales
            </Link>

            <Link
              href={`/${locale}/mentions-legales`}
              className="hover:text-white transition-colors"
            >
              Mentions légales
            </Link>

            <Link
              href={`/${locale}/politique-confidentialite`}
              className="hover:text-white transition-colors"
            >
              Politique de confidentialité
            </Link>

            <Link
              href={`/${locale}/politique-cookies`}
              className="hover:text-white transition-colors"
            >
              Politique des cookies
            </Link>

            <Link
              href={`/${locale}/contact`}
              className="hover:text-emerald-600 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Contact */}
          <a
            href="mailto:contact@ouicv.fr"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors shrink-0 break-all"
          >
            <Mail size={14} className="text-primary" />
            contact@ouicv.fr
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/50 mt-5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-600 leading-5">
            <p>© {year} OuiCV. Tous droits réservés.</p>

            <p>
              Entreprise immatriculée en France • SIRET XXXXX XXXXX XXXXX
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ShieldCheck size={12} className="text-emerald-500" />
              Stripe SSL 256-bit
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <CreditCard size={12} />
              Visa · Mastercard
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
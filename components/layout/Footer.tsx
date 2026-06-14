// 'use client';

// import Link from 'next/link';
// import { useLocale } from 'next-intl';
// import { Mail, MapPin, ShieldCheck, CreditCard, ExternalLink } from 'lucide-react';

// export default function Footer() {
//   const locale = useLocale();
//   const currentYear = new Date().getFullYear();

//   return (
//     <footer className="bg-slate-900 text-slate-300 py-20 mt-20 border-t border-slate-800">
//       <div className="container mx-auto px-6">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
//           {/* Brand Section */}
//           <div className="col-span-1 md:col-span-1 space-y-6">
//             <Link href={`/${locale}`} className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
//               <span className="bg-primary px-2 py-1 rounded-lg">CV</span>Match Pro
//             </Link>
//             <p className="text-sm leading-relaxed text-slate-400">
//               Optimisez votre carrière avec l'intelligence artificielle. Créez des CV percutants, 
//               optimisés pour les systèmes ATS et adaptés au marché européen.
//             </p>
//             <div className="flex items-center gap-4">
//               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer group">
//                 <Mail size={18} className="text-slate-400 group-hover:text-white" />
//               </div>
//             </div>
//           </div>

//           {/* Product Section */}
//           <div className="space-y-6">
//             <h4 className="text-white font-black uppercase text-xs tracking-widest">Produit</h4>
//             <ul className="space-y-4 text-sm">
//               <li><Link href={`/${locale}`} className="hover:text-primary transition-colors">Accueil</Link></li>
//               <li><Link href={`/${locale}#pricing`} className="hover:text-primary transition-colors">Tarifs</Link></li>
//               <li><Link href={`/${locale}/dashboard`} className="hover:text-primary transition-colors">Mon Tableau de bord</Link></li>
//             </ul>
//           </div>

//           {/* Legal Section */}
//           <div className="space-y-6">
//             <h4 className="text-white font-black uppercase text-xs tracking-widest">Légal</h4>
//             <ul className="space-y-4 text-sm">
//               <li><Link href={`/${locale}/terms`} className="hover:text-primary transition-colors">Conditions Générales</Link></li>
//               <li><Link href={`/${locale}/legal-notice`} className="hover:text-primary transition-colors">Mentions Légales</Link></li>
//               <li><Link href={`/${locale}/refund`} className="hover:text-primary transition-colors">Politique de Remboursement</Link></li>
//               <li><Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">Données Personnelles (RGPD)</Link></li>
//             </ul>
//           </div>

//           {/* Contact Section */}
//           <div className="space-y-6">
//             <h4 className="text-white font-black uppercase text-xs tracking-widest">Contact & Support</h4>
//             <div className="space-y-4 text-sm">
//               <div className="flex items-start gap-3">
//                 <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
//                 <p>RushAI<br />2 Claude Chappe, 37300<br />Joué-lès-Tours, France</p>
//               </div>
//               <div className="flex items-center gap-3">
//                 <Mail size={18} className="text-primary shrink-0" />
//                 <a href="mailto:contact@rushai.pro" className="hover:text-white transition-colors">contact@rushai.pro</a>
//               </div>
//               <div className="pt-4">
//                 <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
//                   <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
//                     <ShieldCheck size={14} /> Paiement Sécurisé
//                   </div>
//                   <p className="text-[10px] text-slate-500">Stripe & SSL Encryption 256-bit</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
//           <div className="text-xs text-slate-500">
//             © {currentYear} RushAI. Tous droits réservés. SIRET: (A renseigner)
//           </div>
//           <div className="flex items-center gap-8">
//              <div className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors cursor-pointer">
//                <CreditCard size={14} /> Visa / Mastercard / Apple Pay
//              </div>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// //2nd version//

// 'use client';

// import Link from 'next/link';
// import { useLocale } from 'next-intl';
// import { Mail, MapPin, ShieldCheck, CreditCard, ArrowUpRight } from 'lucide-react';
// import Image from 'next/image';

// export default function Footer() {
//   const locale = useLocale();
//   const currentYear = new Date().getFullYear();

//   return (
//     <footer className="bg-slate-950 text-slate-400 mt-24 border-t border-slate-800/50">
//       <div className="max-w-7xl mx-auto px-6 py-20">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

//           {/* Brand */}
//           <div className="col-span-1 md:col-span-1 space-y-6">
//             <Link href={`/${locale}`} className="flex items-center gap-3">
//               <Image src="/ouicvlogo.png" alt="CVBoost" width={40} height={40} className="rounded-xl" />
//               <span className="text-2xl font-black text-white tracking-tight">
//                 CV<span className="text-primary">Boost</span>
//               </span>
//             </Link>
//             <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
//               Optimisez votre carrière avec l'IA. CVs percutants, optimisés ATS, adaptés au marché européen.
//             </p>
//             <div className="flex items-center gap-3">
//               <a
//                 href="mailto:contact@rushai.pro"
//                 className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-primary transition-all duration-200 group"
//               >
//                 <Mail size={16} className="text-slate-400 group-hover:text-white transition-colors" />
//               </a>
//             </div>
//           </div>

//           {/* Product */}
//           <div className="space-y-5">
//             <h4 className="text-white font-black uppercase text-xs tracking-[0.2em]">Produit</h4>
//             <ul className="space-y-3 text-sm">
//               {[
//                 { label: 'Accueil', href: `/${locale}` },
//                 { label: 'Tarifs', href: `/${locale}#pricing` },
//                 { label: 'Mon Dashboard', href: `/${locale}/dashboard` },
//               ].map(link => (
//                 <li key={link.label}>
//                   <Link
//                     href={link.href}
//                     className="hover:text-white transition-colors flex items-center gap-1.5 group"
//                   >
//                     {link.label}
//                     <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           {/* Legal */}
//           <div className="space-y-5">
//             <h4 className="text-white font-black uppercase text-xs tracking-[0.2em]">Légal</h4>
//             <ul className="space-y-3 text-sm">
//               {[
//                 { label: 'Conditions Générales', href: `/${locale}/terms` },
//                 { label: 'Mentions Légales', href: `/${locale}/legal-notice` },
//                 { label: 'Remboursement', href: `/${locale}/refund` },
//                 { label: 'RGPD', href: `/${locale}/privacy` },
//               ].map(link => (
//                 <li key={link.label}>
//                   <Link href={link.href} className="hover:text-white transition-colors">
//                     {link.label}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           {/* Contact */}
//           <div className="space-y-5">
//             <h4 className="text-white font-black uppercase text-xs tracking-[0.2em]">Contact</h4>
//             <div className="space-y-4 text-sm">
//               <div className="flex items-start gap-3">
//                 <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
//                 <p className="text-slate-500 leading-relaxed">
//                   RushAI<br />
//                   2 Claude Chappe, 37300<br />
//                   Joué-lès-Tours, France
//                 </p>
//               </div>
//               <div className="flex items-center gap-3">
//                 <Mail size={16} className="text-primary shrink-0" />
//                 <a href="mailto:contact@rushai.pro" className="hover:text-white transition-colors">
//                   contact@rushai.pro
//                 </a>
//               </div>
//               <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
//                 <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
//                   <ShieldCheck size={13} /> Paiement Sécurisé
//                 </div>
//                 <p className="text-[10px] text-slate-600">Stripe · SSL 256-bit</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Bottom bar */}
//         <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
//           <p className="text-xs text-slate-600">
//             © {currentYear} RushAI — CVBoost. Tous droits réservés.
//           </p>
//           <div className="flex items-center gap-2 text-xs text-slate-600">
//             <CreditCard size={13} />
//             Visa · Mastercard · Apple Pay
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

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Main row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div className="flex items-center shrink-0">
            <Image src="/ouicvlogo.png" alt="OuiCV" width={150} height={50} className="object-contain" style={{ height: 'auto' }} />
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400">
            <Link href={`/${locale}`} className="hover:text-white transition-colors">Accueil</Link>
            <Link href={`/${locale}#pricing`} className="hover:text-white transition-colors">Tarifs</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">CGU</Link>
            <Link href={`/${locale}/legal-notice`} className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">RGPD</Link>
          </nav>

          {/* Contact */}
          <a
            href="mailto:contact@rushai.pro"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <Mail size={14} className="text-primary" />
            contact@rushai.pro
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {year} RushAI — OuiCV. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ShieldCheck size={12} className="text-emerald-500" />
              Stripe SSL 256-bit
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <CreditCard size={12} />
              Visa · Mastercard · Apple Pay
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
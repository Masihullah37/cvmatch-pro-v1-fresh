// "use client";

// import Link from "next/link";
// import { Suspense, useEffect, useMemo } from "react";
// import { useSearchParams } from "next/navigation";

// /**
//  * Stripe success_url lands here first so we can send ngrok-skip-browser-warning
//  * before the final redirect (avoids the ngrok interstitial on free tunnels).
//  */
// function PaymentBridgeContent() {
//   const searchParams = useSearchParams();
//   const { destination, error } = useMemo(() => {
//     const target = searchParams.get("target");
//     if (!target) {
//       return { destination: null, error: "Lien de retour invalide." };
//     }

//     try {
//       const decodedTarget = decodeURIComponent(target);
//       if (!decodedTarget.startsWith("/")) {
//         return { destination: null, error: "Lien de retour invalide." };
//       }
//       return { destination: decodedTarget, error: null };
//     } catch {
//       return { destination: null, error: "Lien de retour invalide." };
//     }
//   }, [searchParams]);

//   useEffect(() => {
//     if (!destination) {
//       return;
//     }

//     const fullUrl = `${window.location.origin}${destination}`;
//     const goToDestination = () => window.location.replace(fullUrl);

//     if (destination.includes("payment=success")) {
//       fetch("/api/user/refresh-rate-limits", {
//         method: "POST",
//         credentials: "include",
//       }).catch(() => {});
//     }

//     fetch(fullUrl, {
//       method: "GET",
//       headers: { "ngrok-skip-browser-warning": "true" },
//       credentials: "include",
//       redirect: "follow",
//     })
//       .catch(() => {
//         /* Still redirect; fetch is best-effort to set the ngrok cookie. */
//       })
//       .finally(goToDestination);
//   }, [destination]);

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-8">
//       {error ? (
//         <>
//           <p className="text-red-600 font-bold">{error}</p>
//           <Link href="/" className="text-primary font-bold underline">
//             Retour a l&apos;accueil
//           </Link>
//         </>
//       ) : (
//         <>
//           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
//           <p className="text-slate-700 font-bold">
//             Paiement confirme - redirection en cours...
//           </p>
//         </>
//       )}
//     </div>
//   );
// }

// export default function PaymentBridgePage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="min-h-screen flex items-center justify-center bg-slate-50">
//           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
//         </div>
//       }
//     >
//       <PaymentBridgeContent />
//     </Suspense>
//   );
// }



"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function PaymentBridgeContent() {
  const searchParams = useSearchParams();
  const { destination, error } = useMemo(() => {
    const target = searchParams.get("target");
    if (!target) {
      return { destination: null, error: "Lien de retour invalide." };
    }

    try {
      const decodedTarget = decodeURIComponent(target);
      if (!decodedTarget.startsWith("/")) {
        return { destination: null, error: "Lien de retour invalide." };
      }
      return { destination: decodedTarget, error: null };
    } catch {
      return { destination: null, error: "Lien de retour invalide." };
    }
  }, [searchParams]);

  useEffect(() => {
    if (!destination) {
      return;
    }

    const fullUrl = `${window.location.origin}${destination}`;
    const goToDestination = () => window.location.replace(fullUrl);

    if (destination.includes("payment=success")) {
      fetch("/api/user/refresh-rate-limits", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }

    // 🚀 ENV CHECK: Only use the fetch hack if we are running through ngrok tunnels
    const isNgrok = window.location.hostname.includes("ngrok");

    if (isNgrok) {
      fetch(fullUrl, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" },
        credentials: "include",
        redirect: "follow",
      })
        .catch(() => {})
        .finally(goToDestination);
    } else {
      // Direct, instant redirection for Localhost and production Railway environments
      goToDestination();
    }
  }, [destination]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-8">
      {error ? (
        <>
          <p className="text-red-600 font-bold">{error}</p>
          <Link href="/" className="text-primary font-bold underline">
            Retour a l&apos;accueil
          </Link>
        </>
      ) : (
        <>
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-700 font-bold">
            Paiement confirme - redirection en cours...
          </p>
        </>
      )}
    </div>
  );
}

export default function PaymentBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentBridgeContent />
    </Suspense>
  );
}
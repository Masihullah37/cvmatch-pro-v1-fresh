'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function CancellationSuccessToast() {
    const [visible, setVisible] = useState(true);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);

            const params = new URLSearchParams(searchParams.toString());
            params.delete('cancellation');

            const newUrl = params.toString()
                ? `${pathname}?${params.toString()}`
                : pathname;

            router.replace(newUrl, { scroll: false });
        }, 1500);

        return () => clearTimeout(timer);
    }, [router, pathname, searchParams]);

    if (!visible) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <CheckCircle2 size={20} />
            <span className="font-black uppercase tracking-widest text-xs">
                Abonnement résilié avec succès
            </span>
        </div>
    );
}
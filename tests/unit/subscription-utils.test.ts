import { getEffectiveCredits, isCreditsExpired } from '@/lib/utils/subscription';

describe('getEffectiveCredits', () => {
    it('returns 0 for null user', () => {
        expect(getEffectiveCredits(null as any)).toBe(0);
    });

    it('returns credits when no expiry set', () => {
        expect(getEffectiveCredits({ credits: 5, creditsExpiry: null } as any)).toBe(5);
    });

    it('returns credits when expiry is future', () => {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        expect(getEffectiveCredits({ credits: 3, creditsExpiry: future } as any)).toBe(3);
    });

    it('returns 0 when credits is null', () => {
        expect(getEffectiveCredits({ credits: null, creditsExpiry: null } as any)).toBe(0);
    });
});

describe('isCreditsExpired', () => {
    it('returns false when creditsExpiry is null', () => {
        expect(isCreditsExpired({ creditsExpiry: null } as any)).toBe(false);
    });

    it('returns true when expiry is past', () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
        expect(isCreditsExpired({ creditsExpiry: past } as any)).toBe(true);
    });

    it('returns false when expiry is future', () => {
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        expect(isCreditsExpired({ creditsExpiry: future } as any)).toBe(false);
    });
});
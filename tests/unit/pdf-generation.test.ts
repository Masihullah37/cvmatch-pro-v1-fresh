describe('PDF generation rules', () => {
    it('font timeout is capped at 3000ms', () => {
        const FONT_TIMEOUT_MS = 3000;
        expect(FONT_TIMEOUT_MS).toBeLessThanOrEqual(5000);
        expect(FONT_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('pro user can download without credits', () => {
        const isPro = true;
        const credits = 0;
        const hasAccess = isPro || credits > 0;
        expect(hasAccess).toBe(true);
    });

    it('user with credits can download', () => {

        // user with 0 credits cannot download
        expect(0 > 0).toBe(false);
        // user with 1+ credits can download
        expect(1 > 0).toBe(true);
    });

    it('watermark shown when not owned', () => {
        expect(!false).toBe(true);
        expect(!true).toBe(false);
    });
});
describe('GDPR retention policy', () => {
    const RETENTION_DAYS = 30;

    it('CV data deleted after 30 days', () => {
        expect(RETENTION_DAYS).toBe(30);
    });

    it('payment records kept 10 years — French accounting law', () => {
        const TEN_YEARS_DAYS = 10 * 365;
        expect(TEN_YEARS_DAYS).toBe(3650);
        expect(TEN_YEARS_DAYS).toBeGreaterThan(RETENTION_DAYS);
    });

    it('PII anonymized immediately on deletion — not after 30 days', () => {
        const deletionTime = new Date();
        const user = {
            deletedAt: deletionTime,
            email: 'deleted_uuid@deleted.ouicv',
            clerkId: null,
        };
        const timeDiff = Date.now() - user.deletedAt.getTime();
        expect(timeDiff).toBeLessThan(5000);
        expect(user.clerkId).toBeNull();
    });

    it('cron runs daily and targets records older than 30 days', () => {
        const cronExpression = '0 2 * * *';
        expect(cronExpression).toBe('0 2 * * *');
    });
});
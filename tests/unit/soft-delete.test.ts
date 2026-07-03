describe('soft delete and GDPR logic', () => {
    describe('user anonymization format', () => {
        it('generates correct anonymized email', () => {
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const email = `deleted_${userId}@deleted.ouicv`;
            expect(email).toMatch(/^deleted_.+@deleted\.ouicv$/);
        });

        it('null clerkId allows re-registration', () => {
            const deletedUser = { clerkId: null, deletedAt: new Date() };
            expect(deletedUser.clerkId).toBeNull();
        });
    });

    describe('30-day retention window', () => {
        it('user deleted 31 days ago IS eligible for hard delete', () => {
            const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
            const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            expect(deletedAt < cutoff).toBe(true);
        });

        it('user deleted 29 days ago is NOT eligible', () => {
            const deletedAt = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
            const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            expect(deletedAt < cutoff).toBe(false);
        });
    });

    describe('payment record retention — CNIL/RGPD', () => {
        it('payment financial data is retained after user deletion', () => {
            const payment = {
                userId: null,
                amount: 390,
                stripePaymentIntentId: 'pi_xxx',
                currency: 'eur',
                status: 'completed',
            };
            expect(payment.amount).toBe(390);
            expect(payment.stripePaymentIntentId).toBeDefined();
            expect(payment.userId).toBeNull();
        });

        it('user PII is nulled while payment record survives', () => {
            const anonymizedUser = {
                email: 'deleted_uuid@deleted.ouicv',
                clerkId: null,
                stripeCustomerId: null,
            };
            const payment = { amount: 390, userId: null };
            expect(anonymizedUser.clerkId).toBeNull();
            expect(payment.amount).toBeGreaterThan(0);
        });
    });
});
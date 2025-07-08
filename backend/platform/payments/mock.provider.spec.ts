// src/platform/payments/mock.provider.test.ts

import { MockPaymentProvider } from './mock.provider';

// Mock the uuid library to return a predictable value
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-1234',
}));

describe('MockPaymentProvider', () => {
    let provider: MockPaymentProvider;
    let randomSpy: jest.SpyInstance;

    beforeEach(() => {
        provider = new MockPaymentProvider();
        // Spy on Math.random to control its output
        randomSpy = jest.spyOn(global.Math, 'random');
        jest.useFakeTimers(); // Mock timers to avoid actual delays
    });

    afterEach(() => {
        randomSpy.mockRestore(); // Clean up the spy
        jest.useRealTimers();
    });

    describe('initiateDeposit', () => {
        it('should resolve with a SUCCESS response when random value is high', async () => {
            randomSpy.mockReturnValue(0.5); // Guarantees success (>= 0.1)

            const promise = provider.initiateDeposit(100, 'USD');
            jest.runAllTimers(); // Fast-forward the setTimeout

            await expect(promise).resolves.toEqual({
                providerTransactionId: 'mock_mock-uuid-1234',
                status: 'SUCCESS',
            });
        });

        it('should reject with a FAILURE response when random value is low', async () => {
            randomSpy.mockReturnValue(0.05); // Guarantees failure (< 0.1)

            const promise = provider.initiateDeposit(100, 'USD');
            jest.runAllTimers();

            await expect(promise).rejects.toThrow('Provider declined the transaction.');
        });
    });

    describe('initiateWithdrawal', () => {
        it('should resolve with a SUCCESS response', async () => {
            randomSpy.mockReturnValue(0.9); // Success

            const promise = provider.initiateWithdrawal(50, 'EUR');
            jest.runAllTimers();

            await expect(promise).resolves.toEqual({
                providerTransactionId: 'mock_mock-uuid-1234',
                status: 'SUCCESS',
            });
        });

        it('should reject with a FAILURE response', async () => {
            randomSpy.mockReturnValue(0.01); // Failure

            const promise = provider.initiateWithdrawal(50, 'EUR');
            jest.runAllTimers();

            await expect(promise).rejects.toThrow('Provider declined the transaction.');
        });
    });
});
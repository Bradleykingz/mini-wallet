import { v4 as uuidv4 } from 'uuid';

export interface PaymentProviderResponse {
    providerTransactionId: string;
    status: 'SUCCESS' | 'FAILURE';
    message?: string;
}

export abstract class IPaymentProvider {
    /**
     * Initiates a deposit transaction.
     * @param amount - The amount to deposit.
     * @param currency - The currency of the deposit.
     * @returns A promise that resolves to a PaymentProviderResponse.
     */
    abstract initiateDeposit(amount: number, currency: string): Promise<PaymentProviderResponse>;

    /**
     * Initiates a withdrawal transaction.
     * @param amount - The amount to withdraw.
     * @param currency - The currency of the withdrawal.
     * @returns A promise that resolves to a PaymentProviderResponse.
     */
    abstract initiateWithdrawal(amount: number, currency: string): Promise<PaymentProviderResponse>;

}

/**
 * Simulates a third-party payment provider API.
 * It introduces random delays and failures to mimic real-world conditions.
 */
export class MockPaymentProvider extends IPaymentProvider {

    private simulateApiCall(amount: number): Promise<PaymentProviderResponse> {
        return new Promise((resolve, reject) => {
            const delay = Math.random() * 1000 + 500; // 500ms to 1.5s delay

            setTimeout(() => {
                // Simulate a 10% failure rate
                if (Math.random() < 0.1) {
                    const response: PaymentProviderResponse = {
                        providerTransactionId: `mock_${uuidv4()}`,
                        status: 'FAILURE',
                        message: 'Provider declined the transaction.'
                    };
                    // In a real API, this might be a rejected promise or a non-200 status code
                    reject(new Error(response.message));
                } else {
                    const response: PaymentProviderResponse = {
                        providerTransactionId: `mock_${uuidv4()}`,
                        status: 'SUCCESS'
                    };
                    resolve(response);
                }
            }, delay);
        });
    }

    public async initiateDeposit(amount: number, currency: string): Promise<PaymentProviderResponse> {
        console.log(`[MockProvider] Initiating deposit of ${amount} ${currency}...`);
        return this.simulateApiCall(amount);
    }

    public async initiateWithdrawal(amount: number, currency: string): Promise<PaymentProviderResponse> {
        console.log(`[MockProvider] Initiating withdrawal of ${amount} ${currency}...`);
        return this.simulateApiCall(amount);
    }
}
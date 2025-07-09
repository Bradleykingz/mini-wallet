export type Tokens = {
    accessToken: string;
}

export type Wallet = {
    id: number;
    agentId: number;
    balance: string; // Balance in the smallest unit (e.g., cents for USD)
    currency: string; // ISO 4217 currency code
    createdAt: string;
    updatedAt: string;
}

export type Transaction = {
    referenceId: string;
    status: "pending" | "completed" | "failed";
    createdAt: string;
    description?: string;
    type: "credit" | "debit" | "cash_out";
    amount: string; // Amount in the smallest unit (e.g., cents for USD)
    currency: string; // ISO 4217 currency code
}
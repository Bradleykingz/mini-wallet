export function formatCurrency(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
}
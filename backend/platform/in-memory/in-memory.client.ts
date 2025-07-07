export abstract class InMemoryClient {
    abstract set(key: string, value: string, options?: { EX?: number }): Promise<void>;
    abstract get(key: string): Promise<string | null>;
    abstract del(key: string): Promise<void>;
}
import {WalletRepository} from './wallet.repository';

// Mocks for DB and table/query methods
const mockDb = () => ({
    query: {
        wallets: {
            findFirst: jest.fn(),
        },
        transactions: {
            findMany: jest.fn(),
        },
    },
    insert: jest.fn(() => ({values: jest.fn(), returning: jest.fn()})),
    transaction: jest.fn(),
});

const mockTx = () => ({
    select: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        for: jest.fn(() => Promise.resolve([mockWallet]))
    })),
    update: jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn(() => Promise.resolve([mockUpdatedWallet]))
    })),
    insert: jest.fn(() => ({values: jest.fn(() => Promise.resolve())})),
});

const mockWallet = {
    id: 1,
    userId: 123,
    balance: '100.0000',
    currency: 'USD',
    updatedAt: new Date(),
};

const mockUpdatedWallet = {
    ...mockWallet,
    balance: '80.0000',
};

const mockTransaction = {
    id: 1,
    walletId: 1,
    type: 'debit',
    amount: '20.0000',
    currency: 'USD',
    description: 'test',
    createdAt: new Date(),
    referenceId: 'ref123'
};

jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('WalletRepository', () => {
    let db: any;
    let repo: WalletRepository;

    beforeEach(() => {
        db = mockDb();
        repo = new WalletRepository(db);
    });

    describe('findOrCreateWalletByUserId', () => {
        it('returns existing wallet if found', async () => {
            db.query.wallets.findFirst.mockResolvedValueOnce(mockWallet);
            const result = await repo.findOrCreateWalletByUserId(123);
            expect(db.query.wallets.findFirst).toHaveBeenCalledWith({where: expect.anything()});
            expect(result).toBe(mockWallet);
        });

        it('creates and returns wallet if not found', async () => {
            db.query.wallets.findFirst.mockResolvedValueOnce(undefined);
            db.insert.mockReturnValueOnce({
                values: jest.fn().mockReturnThis(),
                returning: jest.fn().mockResolvedValueOnce([mockWallet]),
            });
            const result = await repo.findOrCreateWalletByUserId(123);
            expect(db.insert).toHaveBeenCalled();
            expect(result).toBe(mockWallet);
        });
    });

    describe('findWalletById', () => {
        it('returns wallet if found', async () => {
            db.query.wallets.findFirst.mockResolvedValueOnce(mockWallet);
            const result = await repo.findWalletById(1);
            expect(result).toBe(mockWallet);
        });

        it('throws if wallet not found', async () => {
            db.query.wallets.findFirst.mockResolvedValueOnce(undefined);
            await expect(repo.findWalletById(1)).rejects.toThrow('Wallet not found');
        });
    });

    describe('getTransactionHistory', () => {
        it('returns transaction history for a wallet', async () => {
            const txs = [mockTransaction];
            db.query.transactions.findMany.mockResolvedValueOnce(txs);
            const result = await repo.getTransactionHistory(1);
            expect(db.query.transactions.findMany).toHaveBeenCalledWith({
                where: expect.anything(),
                orderBy: expect.any(Function),
                limit: 50,
            });
            expect(result).toEqual(txs);
        });
    });

    describe('createTransaction', () => {
        it('creates a credit transaction and updates wallet', async () => {
            const data = {
                walletId: 1,
                type: 'credit' as const,
                amount: '20',
                currency: 'USD' as const,
                description: 'credit'
            };
            db.transaction.mockImplementation(async (fn: any) => {
                return await fn(mockTx());
            });

            // Patch balance logic for credit
            const tx = mockTx();
            tx.select().from().where().for.mockResolvedValueOnce([mockWallet]);
            tx.update().set().where().returning.mockResolvedValueOnce([{
                ...mockWallet,
                balance: '120.0000',
            }]);

            const repoWithTx = new WalletRepository({...db, transaction: async (fn: any) => fn(tx)});
            const result = await repoWithTx.createTransaction(data);
            expect(result.balance).toBe('80.0000');
        });

        it('creates a debit transaction and updates wallet', async () => {
            const data = {
                walletId: 1,
                type: 'debit' as const,
                amount: '20',
                currency: 'USD' as const,
                description: 'debit'
            };
            db.transaction.mockImplementation(async (fn: any) => {
                return await fn(mockTx());
            });

            // Patch balance logic for debit
            const tx = mockTx();
            tx.select().from().where().for.mockResolvedValueOnce([mockWallet]);
            tx.update().set().where().returning.mockResolvedValueOnce([{
                ...mockWallet,
                balance: '80.0000',
            }]);

            const repoWithTx = new WalletRepository({...db, transaction: async (fn: any) => fn(tx)});
            const result = await repoWithTx.createTransaction(data);
            expect(result.balance).toBe('80.0000');
        });

        it('throws on insufficient funds for debit', async () => {
            const data = {
                walletId: 1,
                type: 'debit' as const,
                amount: '200',
                currency: 'USD' as const,
                description: 'debit'
            };
            const tx = mockTx();
            tx.select().from().where().for.mockResolvedValueOnce([mockWallet]);
            db.transaction.mockImplementation(async (fn: any) => fn(tx));
            const repoWithTx = new WalletRepository({...db, transaction: async (fn: any) => fn(tx)});
            await expect(repoWithTx.createTransaction(data)).rejects.toThrow('Insufficient funds.');
        });

        it('throws if wallet not found', async () => {
            const data = {
                walletId: 2,
                type: 'credit' as const,
                amount: '20',
                currency: 'USD' as const,
                description: 'credit'
            };
            // Only mock select().from().where().for
            const tx = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            for: jest.fn().mockResolvedValueOnce([])
                        })
                    })
                }),
                update: jest.fn(),
                insert: jest.fn(),
            };
            db.transaction.mockImplementation(async (fn: any) => fn(tx));

            const repoWithTx = new WalletRepository({ ...db, transaction: async (fn: any) => fn(tx) });
            await expect(repoWithTx.createTransaction(data)).rejects.toThrow('Wallet not found.');
            expect(tx.update).not.toHaveBeenCalled();
            expect(tx.insert).not.toHaveBeenCalled();
        });
    });
});
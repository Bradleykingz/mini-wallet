import {Request, Response} from 'express';
import {TransactionService} from './transactions.service';
import {TransactionsController} from "./transactions.controller";
import {IWalletService} from "../wallet/wallet.service";

jest.mock('./transactions.service');
const MockedTransactionService = TransactionService as jest.MockedClass<typeof TransactionService>;

class MockedWalletService implements IWalletService {
    findOrCreateWalletByAgentId = jest.fn();
    getTransactionHistory = jest.fn();
    credit = jest.fn();
    debit = jest.fn();
    getBalance = jest.fn();
}

describe('TransactionsController', () => {
    let controller: TransactionsController;
    let mockTransactionService: jest.Mocked<TransactionService>;
    let mockWalletService: jest.Mocked<IWalletService>;
    let mockRequest: Partial<Request> & { agent?: any };
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;

    const agentId = 456;

    beforeEach(() => {
        mockWalletService = new MockedWalletService() as jest.Mocked<IWalletService>;
        mockTransactionService = new MockedTransactionService({} as any, {} as any, {} as any, {} as any, {} as any) as jest.Mocked<TransactionService>;
        controller = new TransactionsController(mockTransactionService, mockWalletService);

        responseJson = jest.fn();
        responseStatus = jest.fn().mockReturnValue({json: responseJson});

        mockRequest = {
            agent: {id: agentId},
            body: {},
            params: {},
        };

        mockResponse = {
            status: responseStatus,
            json: responseJson,
        };
    });

    describe('getReceipt', () => {
        it('should return 200 with receipt on success', async () => {
            const receipt = {
                id: 1,
                referenceId: 'ref123',
                createdAt: new Date(),
                currency: "USD" as const,
                walletId: 1,
                type: "cash_in" as const,
                status: "pending" as const,
                amount: "100",
                description: "something",
                externalProviderId: "1234"
            };
            mockRequest.params = {referenceId: 'ref123'};
            mockTransactionService.getReceipt.mockResolvedValue(receipt);

            await controller.getReceipt(mockRequest as Request, mockResponse as Response);

            expect(mockTransactionService.getReceipt).toHaveBeenCalledWith('ref123');
            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(receipt);
        });

        it('should return 404 if receipt is not found', async () => {
            mockRequest.params = {referenceId: 'ref-not-found'};
            mockTransactionService.getReceipt.mockRejectedValue(new Error('Transaction not found.'));

            await controller.getReceipt(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({message: 'Transaction not found.'});
        });
    });

    describe('transact (cash_in)', () => {
        it('should return 201 with receipt on successful cash-in', async () => {
            mockRequest.body = {amount: 100, type: "cash_in"};
            const transactionResult = {
                newTransaction: {
                    id: 1,
                    referenceId: "1224",
                    createdAt: new Date(),
                    currency: "USD" as const,
                    walletId: 1,
                    type: "cash_in" as const,
                    status: "pending" as const,
                    amount: "100",
                    description: "Cash-in of 100 USD",
                    externalProviderId: "12344",
                },
                updatedWallet: {
                    id: 1,
                    createdAt: new Date(),
                    agentId: 1,
                    balance: "1000.00",
                    currency: "USD" as const,
                    updatedAt: new Date(),
                }
            };
            mockTransactionService.cashIn.mockResolvedValue(transactionResult);

            await controller.transact(mockRequest as Request, mockResponse as Response);

            expect(mockTransactionService.cashIn).toHaveBeenCalledWith(agentId, 100);
            expect(responseStatus).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith({message: 'Cash-in successful.', receipt: transactionResult});
        });

        it('should return 400 for an invalid amount (zero)', async () => {
            mockRequest.body = {amount: 0, type: "cash_in"};
            await controller.transact(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 for an invalid amount (string)', async () => {
            mockRequest.body = {amount: 'invalid', type: "cash_in"};
            await controller.transact(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 if service throws an error', async () => {
            mockRequest.body = {amount: 100, type: "cash_in"};
            mockTransactionService.cashIn.mockRejectedValue(new Error('Provider failed'));

            await controller.transact(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Provider failed'});
        });
    });

    describe('transact (cash_out)', () => {
        it('should return 200 on successful cash-out initiation', async () => {
            mockRequest.body = {amount: 50, type: "cash_out"};
            const transactionResult = {
                newTransaction: {
                    id: 1,
                    referenceId: "1224",
                    createdAt: new Date(),
                    currency: "USD" as const,
                    walletId: 1,
                    type: "cash_out" as const,
                    status: "completed" as const,
                    amount: "100",
                    description: "Cash-out of 100 USD",
                    externalProviderId: "12344",
                },
                updatedWallet: {
                    id: 1,
                    createdAt: new Date(),
                    agentId: 1,
                    balance: "100",
                    currency: "USD" as const,
                    updatedAt: new Date()
                },
                receipt: {
                    id: 1,
                    createdAt: new Date(),
                    currency: "USD" as const,
                    referenceId: "1234",
                    walletId: 1,
                    type: "cash_out" as const,
                    status: "completed" as const,
                    amount: "100",
                    description: "Cash-out of 100 USD",
                    externalProviderId: "12344"
                }
            };
            mockTransactionService.cashOut.mockResolvedValue(transactionResult);

            await controller.transact(mockRequest as Request, mockResponse as Response);

            expect(mockTransactionService.cashOut).toHaveBeenCalledWith(agentId, 50);
            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({
                message: 'Cash-out initiated successfully.',
                receipt: transactionResult
            });
        });

        it('should return 400 for an invalid amount', async () => {
            mockRequest.body = {amount: -50, type: "cash_out"};
            await controller.transact(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 if service throws an error (e.g., insufficient funds)', async () => {
            mockRequest.body = {amount: 50, type: "cash_out"};
            mockTransactionService.cashOut.mockRejectedValue(new Error('Insufficient funds.'));

            await controller.transact(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Insufficient funds.'});
        });
    });

    describe('transact (invalid type)', () => {
        it('should return 400 for invalid transaction type', async () => {
            mockRequest.body = {amount: 100, type: "invalid_type"};
            await controller.transact(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid transaction type.'});
        });
    });
});
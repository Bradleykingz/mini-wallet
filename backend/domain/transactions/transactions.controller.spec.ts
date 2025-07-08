// src/domain/transactions/transaction.controller.test.ts

import {Request, Response} from 'express';
import {TransactionService} from './transactions.service';
import {TransactionsController} from "./transactions.controller";

jest.mock('./transactions.service');
const MockedTransactionService = TransactionService as jest.MockedClass<typeof TransactionService>;

describe('TransactionController', () => {
    let controller: TransactionsController;
    let mockTransactionService: jest.Mocked<TransactionService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;

    const userId = 456;

    beforeEach(() => {
        mockTransactionService = new MockedTransactionService({} as any, {} as any, {} as any, {} as any, {} as any) as jest.Mocked<TransactionService>;
        controller = new TransactionsController(mockTransactionService);

        responseJson = jest.fn();
        responseStatus = jest.fn().mockReturnValue({json: responseJson});

        mockRequest = {
            user: {sub: userId},
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

    describe('cashIn', () => {
        it('should return 201 with receipt on successful cash-in', async () => {
            mockRequest.body = {amount: 100};
            const transactionResult = {
                newTransaction: {
                    id: 1,
                    referenceId: "1224",
                    createdAt: new Date(),
                    currency: "USD" as const,
                    walletId: 1,
                    type: "credit" as const,
                    status: "pending" as const,
                    amount: "100",
                    description: "Cash-in of 100 USD",
                    externalProviderId: "12344",
                },
                updatedWallet: {
                    id: 1,
                    createdAt: new Date(),
                    userId: 1,
                    balance: "1000.00",
                    currency: "USD" as const,
                    updatedAt: new Date(),
                }
            };
            mockTransactionService.cashIn.mockResolvedValue(transactionResult);

            await controller.cashIn(mockRequest as Request, mockResponse as Response);

            expect(mockTransactionService.cashIn
            ).toHaveBeenCalledWith(userId, 100);
            expect(responseStatus).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith({message: 'Cash-in successful.', receipt: transactionResult});
        })
        ;

        it('should return 400 for an invalid amount (zero)', async () => {
            mockRequest.body = {amount: 0};
            await controller.cashIn(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 for an invalid amount (string)', async () => {
            mockRequest.body = {amount: 'invalid'};
            await controller.cashIn(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 if service throws an error', async () => {
            mockRequest.body = {amount: 100};
            mockTransactionService.cashIn.mockRejectedValue(new Error('Provider failed'));

            await controller.cashIn(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Provider failed'});
        });
    });

    describe('cashOut', () => {
        it('should return 200 on successful cash-out initiation', async () => {
            mockRequest.body = {amount: 50};
            const transactionResult = {
                id: 1,
                referenceId: "1224",
                createdAt: new Date(),
                currency: "USD" as const,
                walletId: 1,
                type: "credit" as const,
                status: "completed" as const,
                amount: "100",
                description: "Cash-in of 100 USD",
                externalProviderId: "12344",
            };
            mockTransactionService.cashOut.mockResolvedValue(transactionResult);

            await controller.cashOut(mockRequest as Request, mockResponse as Response);

            expect(mockTransactionService.cashOut).toHaveBeenCalledWith(userId, 50);
            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({
                message: 'Cash-out initiated successfully.',
                receipt: transactionResult
            });
        });

        it('should return 400 for an invalid amount', async () => {
            mockRequest.body = {amount: -50};
            await controller.cashOut(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Invalid amount provided.'});
        });

        it('should return 400 if service throws an error (e.g., insufficient funds)', async () => {
            mockRequest.body = {amount: 50};
            mockTransactionService.cashOut.mockRejectedValue(new Error('Insufficient funds.'));

            await controller.cashOut(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'Insufficient funds.'});
        });
    });
});
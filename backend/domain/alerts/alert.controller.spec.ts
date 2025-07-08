// src/domain/alerts/alert.controller.test.ts

import {Request, Response} from 'express';
import {AlertController} from './alert.controller';
import {AlertService} from './alert.service';

// Mock the service it depends on
jest.mock('./alert.service');

const MockedAlertService = AlertService as jest.MockedClass<typeof AlertService>;

describe('AlertController', () => {
    let controller: AlertController;
    let mockAlertService: jest.Mocked<AlertService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;
    let responseSend: jest.Mock;

    const agentId = 123;

    beforeEach(() => {
        mockAlertService = new MockedAlertService(
            {} as any,
            {} as any,
            {} as any,
        ) as jest.Mocked<AlertService>;

        controller = new AlertController(mockAlertService);

        responseJson = jest.fn();
        responseSend = jest.fn();
        responseStatus = jest.fn().mockImplementation(() => ({
            json: responseJson,
            send: responseSend,
        }));

        mockRequest = {
            agent: {sub: agentId}, // Assuming agent ID is from a JWT payload or middleware
            body: {},
        };

        mockResponse = {
            status: responseStatus,
            json: responseJson,
            send: responseSend,
        };
    });

    describe('getActiveAlerts', () => {
        it('should return 200 with alerts data on success', async () => {
            const serviceResult = {
                alerts: [{
                    id: 1,
                    message: 'hi',
                    createdAt: new Date(),
                    agentId,
                    title: 'Test Alert',
                    level: "info" as const,
                    isRead: false
                }], source: 'db' as const
            };
            mockAlertService.getActiveAlerts.mockResolvedValue(serviceResult);

            await controller.getActiveAlerts(mockRequest as Request, mockResponse as Response);

            expect(mockAlertService.getActiveAlerts).toHaveBeenCalledWith(agentId);
            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(serviceResult);
        });

        it('should return 500 if the service throws an error', async () => {
            mockAlertService.getActiveAlerts.mockRejectedValue(new Error('DB error'));

            await controller.getActiveAlerts(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({message: 'Failed to retrieve alerts.'});
        });
    });

    describe('markAsRead', () => {
        it('should return 204 No Content on success', async () => {
            mockRequest.body = {alertIds: [1, 2, 3]};
            mockAlertService.markAlertsAsRead.mockResolvedValue(undefined);

            await controller.markAsRead(mockRequest as Request, mockResponse as Response);

            expect(mockAlertService.markAlertsAsRead).toHaveBeenCalledWith(agentId, [1, 2, 3]);
            expect(responseStatus).toHaveBeenCalledWith(204);
            expect(responseSend).toHaveBeenCalled();
        });

        it('should return 400 if alertIds is not an array', async () => {
            mockRequest.body = {alertIds: 'not-an-array'};

            await controller.markAsRead(mockRequest as Request, mockResponse as Response);

            expect(mockAlertService.markAlertsAsRead).not.toHaveBeenCalled();
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'alertIds must be a non-empty array.'});
        });

        it('should return 400 if alertIds is an empty array', async () => {
            mockRequest.body = {alertIds: []};

            await controller.markAsRead(mockRequest as Request, mockResponse as Response);

            expect(mockAlertService.markAlertsAsRead).not.toHaveBeenCalled();
            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({message: 'alertIds must be a non-empty array.'});
        });

        it('should return 500 if the service throws an error', async () => {
            mockRequest.body = {alertIds: [1]};
            mockAlertService.markAlertsAsRead.mockRejectedValue(new Error('Update failed'));

            await controller.markAsRead(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({message: 'Failed to update alerts.'});
        });
    });
});
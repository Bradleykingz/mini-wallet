import { Request, Response } from 'express';
import {AuthService} from "./auth.service";

export class AuthController {
    constructor(private authService: AuthService) {}

    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ message: 'Email and password are required' });
                return;
            }
            const user = await this.authService.register({ email, password });
            res.status(201).json({ message: 'Registration successful', user });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ message: 'Email and password are required' });
                return;
            }
            const result = await this.authService.login({ email, password });
            res.status(200).json({ message: 'Login successful', ...result });
        } catch (error: any) {
            res.status(401).json({ message: error.message });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            // The JTI is attached to the request by our auth middleware
            const jti = (req as any).jti;
            if (!jti) {
                res.status(400).json({ message: 'Token not provided or invalid' });
                return;
            }
            await this.authService.logout(jti);
            res.status(200).json({ message: 'Logout successful' });
        } catch (error: any) {
            res.status(500).json({ message: 'An error occurred during logout' });
        }
    }
}
import { Router } from 'express';
import {AuthService} from "./auth.service";
import {AuthController} from "./auth.controller";

export class AuthRouter {

    private router: Router = Router();

    constructor(private authController: AuthController) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/register', (req, res) => this.authController.register(req, res));
        this.router.post('/login', (req, res) => this.authController.login(req, res));
        this.router.post('/logout', (req, res) => this.authController.logout(req, res));
    }

    public getRouter(): Router {
        return this.router;
    }
}
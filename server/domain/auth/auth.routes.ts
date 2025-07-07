import { Router } from 'express';
import {AuthService} from "./auth.service";
import {AuthController} from "./auth.controller";
import {authMiddleware} from "./auth.middleware";

const router = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

export default router;
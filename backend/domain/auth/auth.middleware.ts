import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import {TokenService} from "../../common/token.service";

// Augment Express's Request type to include our custom properties
declare global {
    namespace Express {
        interface Request {
            agent?: any;
            jti?: string;
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tokenService: TokenService = res.app.get('tokenService');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

        if (!decoded.jti) {
            res.status(401).json({ message: 'Invalid token (missing jti).' });
            return;
        }

        // Check if JTI exists in Redis (i.e., not logged out)
        const isStored = await tokenService.isJtiStored(decoded.jti);
        if (!isStored) {
            res.status(401).json({ message: 'Invalid token (session terminated).' });
            return;
        }

        req.agent = decoded; // Attach agent payload to request
        req.jti = decoded.jti; // Attach jti for logout handling
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Invalid token.' });
    }
}
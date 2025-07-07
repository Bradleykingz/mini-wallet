import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import 'dotenv/config';
import {TokenHelper} from "@server/common/token.helper";

// Augment Express's Request type to include our custom properties
declare global {
    namespace Express {
        interface Request {
            user?: any;
            jti?: string;
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const tokenService: TokenHelper = res.app.get('tokenService');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

        if (!decoded.jti) {
            return res.status(401).json({ message: 'Invalid token (missing jti).' });
        }

        // Check if JTI exists in Redis (i.e., not logged out)
        const isStored = await tokenService.isJtiStored(decoded.jti);
        if (!isStored) {
            return res.status(401).json({ message: 'Invalid token (session terminated).' });
        }

        req.user = decoded; // Attach user payload to request
        req.jti = decoded.jti; // Attach jti for logout handling
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
}
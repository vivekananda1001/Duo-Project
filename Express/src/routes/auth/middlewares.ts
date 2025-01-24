import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';


export const userMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.auth_token;
    if (!token) {
        res.status(401).json({ message: "No token provided. Unauthorized access." });
        return;
    }

    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET || 'default_secret');
        if (typeof decoded === "object" && "id" in decoded) {
            req.id = decoded.id as string;
            next();
        }else {
            res.status(403).json({ error: "Invalid token payload" });
        }
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token." });
    }
};
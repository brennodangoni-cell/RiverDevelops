import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_river_key';

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = payload;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

export function generateToken(user: { id: number; username: string }) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

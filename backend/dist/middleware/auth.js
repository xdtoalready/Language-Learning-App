"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                learningLanguage: true,
                currentStreak: true,
                totalWordsLearned: true
            }
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.userId = decoded.userId;
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=auth.js.map
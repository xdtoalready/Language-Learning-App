"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, (req, res) => {
    res.json({ message: 'Words endpoint' });
});
router.get('/due', auth_1.authenticateToken, (req, res) => {
    res.json({ message: 'Due words endpoint' });
});
exports.default = router;
//# sourceMappingURL=words.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error(err.stack);
    if (err.name === 'PrismaClientKnownRequestError') {
        const message = 'Database error';
        error = { message, statusCode: 400 };
    }
    if (err.name === 'ValidationError') {
        const message = 'Validation error';
        error = { message, statusCode: 400 };
    }
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map
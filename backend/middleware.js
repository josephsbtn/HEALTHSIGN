import createLogger from "./logger.js";

const logger = createLogger("Middleware");

export const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
};

export const errorHandler = (err, req, res, next) => {
  logger.error(
    `Error handling request ${req.method} ${req.path}:`,
    err.message,
  );

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default {
  requestLoggingMiddleware,
  errorHandler,
};

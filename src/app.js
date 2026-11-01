import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { getDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { createBooksRouter } from "./routes/books.js";
import { createBorrowsRouter } from "./routes/borrows.js";

export function createApp({ database, authentication } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  if (env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/", (request, response) => {
    void request;
    response.json({
      success: true,
      message: "BookNook API is running",
    });
  });

  const activeDatabase = database ?? getDatabase();
  app.use("/books", createBooksRouter(activeDatabase.collection("books"), authentication));
  app.use(
    "/borrows",
    createBorrowsRouter({
      booksCollection: activeDatabase.collection("books"),
      borrowsCollection: activeDatabase.collection("borrows"),
      authentication,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

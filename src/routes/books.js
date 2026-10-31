import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";

const booksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  category: z.enum(["Fiction", "Science", "History", "Kids", "Others"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

function createHttpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function createBooksRouter(booksCollection) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const result = booksQuerySchema.safeParse(request.query);

      if (!result.success) {
        throw createHttpError(400, "Invalid books query parameters");
      }

      const { category, limit, search } = result.data;
      const filter = {};

      if (category) {
        filter.category = category;
      }

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { title: { $regex: escapedSearch, $options: "i" } },
          { author: { $regex: escapedSearch, $options: "i" } },
        ];
      }

      const books = await booksCollection
        .find(filter)
        .sort({ addedAt: -1, _id: -1 })
        .limit(limit)
        .toArray();

      response.json({ success: true, data: books });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      if (!ObjectId.isValid(request.params.id)) {
        throw createHttpError(400, "Invalid book ID");
      }

      const book = await booksCollection.findOne({ _id: new ObjectId(request.params.id) });

      if (!book) {
        throw createHttpError(404, "Book not found");
      }

      response.json({ success: true, data: book });
    }),
  );

  return router;
}

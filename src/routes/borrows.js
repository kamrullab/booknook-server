import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/async-handler.js";

const borrowSchema = z.object({
  bookId: z.string().refine(ObjectId.isValid, "Invalid book ID"),
});

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function createBorrowsRouter({ booksCollection, borrowsCollection, authentication = authenticate }) {
  const router = Router();
  router.use(authentication);

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const result = borrowSchema.safeParse(request.body);

      if (!result.success) {
        throw httpError(400, "Invalid borrow data");
      }

      const bookId = new ObjectId(result.data.bookId);
      const existingBorrow = await borrowsCollection.findOne({
        bookId,
        userEmail: request.user.email,
      });

      if (existingBorrow) {
        throw httpError(409, "You have already borrowed this book");
      }

      const book = await booksCollection.findOneAndUpdate(
        { _id: bookId, availableCopies: { $gt: 0 } },
        { $inc: { availableCopies: -1 } },
        { returnDocument: "after" },
      );

      if (!book) {
        throw httpError(409, "This book is not available");
      }

      const borrowDate = new Date();
      const returnDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const borrow = {
        bookId,
        bookTitle: book.title,
        bookImage: book.image,
        userEmail: request.user.email,
        userName: request.user.name,
        borrowDate,
        returnDate,
      };

      try {
        const insertResult = await borrowsCollection.insertOne(borrow);
        response.status(201).json({
          success: true,
          message: "Book borrowed successfully",
          data: { ...borrow, _id: insertResult.insertedId },
        });
      } catch (error) {
        await booksCollection.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } });

        if (error?.code === 11000) {
          throw httpError(409, "You have already borrowed this book");
        }

        throw error;
      }
    }),
  );

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const borrows = await borrowsCollection
        .find({ userEmail: request.user.email })
        .sort({ borrowDate: -1 })
        .toArray();

      response.json({ success: true, data: borrows });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      if (!ObjectId.isValid(request.params.id)) {
        throw httpError(400, "Invalid borrow ID");
      }

      const borrowId = new ObjectId(request.params.id);
      const borrow = await borrowsCollection.findOneAndDelete({
        _id: borrowId,
        userEmail: request.user.email,
      });

      if (!borrow) {
        throw httpError(404, "Borrow record not found");
      }

      try {
        const updateResult = await booksCollection.updateOne(
          { _id: borrow.bookId },
          { $inc: { availableCopies: 1 } },
        );

        if (updateResult.matchedCount === 0) {
          throw new Error("Borrowed book no longer exists");
        }
      } catch (error) {
        await borrowsCollection.insertOne(borrow);
        throw error;
      }

      response.json({ success: true, message: "Book returned successfully" });
    }),
  );

  return router;
}

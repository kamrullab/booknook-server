import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

function createDatabaseStub(books = []) {
  const insertedBooks = [];
  const collection = {
    find() {
      return {
        sort() {
          return this;
        },
        limit(value) {
          this.limitValue = value;
          return this;
        },
        async toArray() {
          return books.slice(0, this.limitValue);
        },
      };
    },
    async findOne() {
      return books[0] ?? null;
    },
    async insertOne(book) {
      insertedBooks.push(book);
      return { insertedId: "created-book-id" };
    },
  };

  return { collection: () => collection, insertedBooks };
}

function createTestApp(books) {
  return createApp({ database: createDatabaseStub(books) });
}

test("GET / reports that the API is available", async () => {
  const response = await request(createTestApp()).get("/").expect(200);

  assert.deepEqual(response.body, {
    success: true,
    message: "BookNook API is running",
  });
  assert.equal(response.headers["x-powered-by"], undefined);
});

test("unknown routes return a JSON 404 response", async () => {
  const response = await request(createTestApp()).get("/missing").expect(404);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Route not found/);
});

test("GET /books returns a limited list of books", async () => {
  const books = [
    { _id: "first", title: "First Book" },
    { _id: "second", title: "Second Book" },
  ];
  const response = await request(createTestApp(books)).get("/books?limit=1").expect(200);

  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, [books[0]]);
});

test("GET /books rejects unsafe limits", async () => {
  const response = await request(createTestApp()).get("/books?limit=1000").expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Invalid books query parameters");
});

test("GET /books/:id rejects malformed identifiers", async () => {
  const response = await request(createTestApp()).get("/books/not-an-id").expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Invalid book ID");
});

test("POST /books requires authentication", async () => {
  const response = await request(createTestApp()).post("/books").send({}).expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Authentication is required");
});

test("POST /books validates and saves owner-controlled book data", async () => {
  const database = createDatabaseStub();
  const app = createApp({ database });
  const token = jwt.sign(
    { email: "READER@example.com", name: "A Reader" },
    env.JWT_SECRET,
    { algorithm: "HS256", subject: "user-123", expiresIn: "5m" },
  );
  const response = await request(app)
    .post("/books")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "  The Quiet Shelf  ",
      author: "Mira Sen",
      category: "Fiction",
      image: "https://images.example.com/book.jpg",
      description: "A thoughtful story about finding a community through books.",
      totalCopies: 4,
      addedBy: { email: "attacker@example.com" },
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(database.insertedBooks.length, 1);
  assert.equal(database.insertedBooks[0].title, "The Quiet Shelf");
  assert.equal(database.insertedBooks[0].availableCopies, 4);
  assert.deepEqual(database.insertedBooks[0].addedBy, {
    userId: "user-123",
    name: "A Reader",
    email: "reader@example.com",
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

function createDatabaseStub(books = []) {
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
  };

  return { collection: () => collection };
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

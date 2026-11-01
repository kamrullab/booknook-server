import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

function token() {
  return jwt.sign({ email: "reader@example.com", name: "Reader" }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
  });
}

function cursor(items) {
  return {
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    async toArray() {
      return items;
    },
  };
}

function databaseStub({ available = true, existingBorrow = null } = {}) {
  const bookId = new ObjectId("507f1f77bcf86cd799439011");
  const borrowId = new ObjectId("507f191e810c19729de860ea");
  const books = {
    find: () => cursor([]),
    findOne: async () => null,
    async findOneAndUpdate() {
      return available ? { _id: bookId, title: "Test Book", image: "https://example.com/book.jpg" } : null;
    },
    async updateOne() {
      return { matchedCount: 1 };
    },
  };
  const borrows = {
    find: () => cursor(existingBorrow ? [existingBorrow] : []),
    async findOne() {
      return existingBorrow;
    },
    async insertOne() {
      return { insertedId: borrowId };
    },
    async findOneAndDelete() {
      return existingBorrow;
    },
  };

  return {
    collection(name) {
      return name === "books" ? books : borrows;
    },
  };
}

test("POST /borrows atomically borrows an available book", async () => {
  const response = await request(createApp({ database: databaseStub() }))
    .post("/borrows")
    .set("Authorization", `Bearer ${token()}`)
    .send({ bookId: "507f1f77bcf86cd799439011" })
    .expect(201);

  assert.equal(response.body.message, "Book borrowed successfully");
  assert.equal(response.body.data.userEmail, "reader@example.com");
  assert.equal(
    new Date(response.body.data.returnDate).getTime() - new Date(response.body.data.borrowDate).getTime(),
    14 * 24 * 60 * 60 * 1000,
  );
});

test("POST /borrows rejects duplicate active borrowing", async () => {
  const response = await request(createApp({ database: databaseStub({ existingBorrow: {} }) }))
    .post("/borrows")
    .set("Authorization", `Bearer ${token()}`)
    .send({ bookId: "507f1f77bcf86cd799439011" })
    .expect(409);

  assert.match(response.body.message, /already borrowed/);
});

test("POST /borrows rejects unavailable books", async () => {
  const response = await request(createApp({ database: databaseStub({ available: false }) }))
    .post("/borrows")
    .set("Authorization", `Bearer ${token()}`)
    .send({ bookId: "507f1f77bcf86cd799439011" })
    .expect(409);

  assert.equal(response.body.message, "This book is not available");
});

test("GET /borrows returns only authenticated-user records", async () => {
  const record = { bookTitle: "Test Book", userEmail: "reader@example.com" };
  const response = await request(createApp({ database: databaseStub({ existingBorrow: record }) }))
    .get("/borrows")
    .set("Authorization", `Bearer ${token()}`)
    .expect(200);

  assert.deepEqual(response.body.data, [record]);
});

test("DELETE /borrows/:id returns an owned borrowed book", async () => {
  const borrow = {
    _id: new ObjectId("507f191e810c19729de860ea"),
    bookId: new ObjectId("507f1f77bcf86cd799439011"),
    userEmail: "reader@example.com",
  };
  const response = await request(createApp({ database: databaseStub({ existingBorrow: borrow }) }))
    .delete("/borrows/507f191e810c19729de860ea")
    .set("Authorization", `Bearer ${token()}`)
    .expect(200);

  assert.equal(response.body.message, "Book returned successfully");
});

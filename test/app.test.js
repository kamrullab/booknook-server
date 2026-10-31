import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

test("GET / reports that the API is available", async () => {
  const response = await request(createApp()).get("/").expect(200);

  assert.deepEqual(response.body, {
    success: true,
    message: "BookNook API is running",
  });
  assert.equal(response.headers["x-powered-by"], undefined);
});

test("unknown routes return a JSON 404 response", async () => {
  const response = await request(createApp()).get("/missing").expect(404);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Route not found/);
});

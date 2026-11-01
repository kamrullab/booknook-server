import { MongoClient } from "mongodb";
import { env } from "./env.js";

let client;
let database;

export async function connectToDatabase() {
  if (database) {
    return database;
  }

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  database = client.db(env.MONGODB_DB_NAME);
  await database.command({ ping: 1 });
  await Promise.all([
    database.collection("books").createIndex({ addedAt: -1 }),
    database.collection("books").createIndex({ "addedBy.email": 1, addedAt: -1 }),
    database.collection("borrows").createIndex(
      { bookId: 1, userEmail: 1 },
      { unique: true },
    ),
    database.collection("borrows").createIndex({ userEmail: 1, borrowDate: -1 }),
  ]);
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("Database has not been connected");
  }

  return database;
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
  }

  client = undefined;
  database = undefined;
}

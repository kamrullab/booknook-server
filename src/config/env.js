import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017"),
  MONGODB_DB_NAME: z.string().min(1).default("booknook"),
  CLIENT_URL: z.url().default("http://localhost:3000"),
  AUTH_JWKS_URL: z.url().default("http://localhost:3000/api/auth/jwks"),
  AUTH_ISSUER: z.url().default("http://localhost:3000"),
  AUTH_AUDIENCE: z.url().default("http://localhost:3000"),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration", parsedEnvironment.error.flatten().fieldErrors);
  throw new Error("Server environment validation failed");
}

export const env = parsedEnvironment.data;

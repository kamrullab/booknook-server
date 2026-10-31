import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function unauthorized(message) {
  return Object.assign(new Error(message), { statusCode: 401 });
}

export function authenticate(request, response, next) {
  void response;

  const authorization = request.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(unauthorized("Authentication is required"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof payload !== "object" || typeof payload.email !== "string") {
      next(unauthorized("Invalid authentication token"));
      return;
    }

    request.user = {
      id: typeof payload.sub === "string" ? payload.sub : undefined,
      email: payload.email.toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : "BookNook Reader",
    };
    next();
  } catch {
    next(unauthorized("Invalid or expired authentication token"));
  }
}

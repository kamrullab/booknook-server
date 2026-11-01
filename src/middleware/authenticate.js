import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";

const jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL));

function unauthorized(message) {
  return Object.assign(new Error(message), { statusCode: 401 });
}

export async function authenticate(request, response, next) {
  void response;
  const authorization = request.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(unauthorized("Authentication is required"));
    return;
  }

  try {
    const token = authorization.slice("Bearer ".length).trim();
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      algorithms: ["EdDSA", "ES256"],
    });

    if (typeof payload.email !== "string") {
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

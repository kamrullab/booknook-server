# BookNook Server

Production-ready Express and MongoDB API for **BookNook - A Small Online Library**. It provides the assignment's eight book and borrowing routes, JWT/JWKS authorization, owner-level access control, atomic copy management, and duplicate-borrow prevention.

## Technology

- Node.js 22 and Express
- MongoDB native driver
- Better Auth JWT verification through remote JWKS
- Zod request and environment validation
- Helmet, restricted CORS, and Morgan
- Node test runner and Supertest

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Create a MongoDB Atlas database and put its connection information in `.env`. Never commit this file.

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER
MONGODB_DB_NAME=booknook
CLIENT_URL=http://localhost:3000
AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
AUTH_ISSUER=http://localhost:3000
AUTH_AUDIENCE=http://localhost:3000
```

## API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/books` | Public | List books with optional `limit`, `category`, and `search` |
| GET | `/books?mine=true` | Private | List books owned by the authenticated user |
| GET | `/books/:id` | Public API | Retrieve one book; the client page is private |
| POST | `/books` | Private | Add a validated book |
| PATCH | `/books/:id` | Owner only | Update a book and safely adjust copies |
| DELETE | `/books/:id` | Owner only | Delete a book |
| POST | `/borrows` | Private | Borrow an available book |
| GET | `/borrows` | Private | List the authenticated user's active borrows |
| DELETE | `/borrows/:id` | Owner only | Return a borrowed book |

`GET /books?mine=true` is query behavior on the required `GET /books` route, not an additional endpoint.

## Security behavior

- Protected requests require `Authorization: Bearer <token>`.
- Tokens are verified against the Better Auth JWKS endpoint with issuer and audience checks.
- Ownership is derived from the verified token, never from client-supplied email fields.
- Borrowing decrements `availableCopies` atomically with MongoDB `$inc`.
- Returning increments the copy count and includes rollback protection.
- A unique compound index prevents concurrent duplicate active borrows.
- Book updates cannot reduce total copies below the number already borrowed.

## Verification

```bash
npm run lint
npm test
npm audit --omit=dev
```

## Render deployment

The included `render.yaml` creates a Node web service. In Render:

1. Create a Blueprint from this repository.
2. Supply `MONGODB_URI` and the deployed Vercel URL as `CLIENT_URL`.
3. Set `AUTH_JWKS_URL` to `https://YOUR-CLIENT.vercel.app/api/auth/jwks`.
4. Set both `AUTH_ISSUER` and `AUTH_AUDIENCE` to `https://YOUR-CLIENT.vercel.app`.
5. Deploy and verify the root health endpoint returns `BookNook API is running`.

After obtaining the Render URL, add it to the client deployment as `NEXT_PUBLIC_API_URL`.

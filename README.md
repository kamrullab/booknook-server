# BookNook Server

> Secure REST API for BookNook’s community book inventory and borrowing lifecycle.

[![API](https://img.shields.io/badge/Live_API-Render-18332B?style=for-the-badge)](https://booknook-server-xlsi.onrender.com)
[![Client](https://img.shields.io/badge/Client-Vercel-EA7A4B?style=for-the-badge)](https://booknookbd.vercel.app)

## Overview

BookNook Server is a production-ready Express and MongoDB API. It stores books and active borrow records, verifies Better Auth access tokens through remote JWKS, enforces book ownership, and keeps copy counts correct during concurrent borrow and return operations.

The API trusts identity only after token verification. Names, emails, and user IDs supplied in request bodies are never used to determine ownership.

## Core capabilities

- Public book listing, searching, category filtering, and individual lookup
- Authenticated book creation
- Owner-only book updates and deletion
- Authenticated borrowing and returning
- Atomic availability updates that prevent negative inventory
- Duplicate active-borrow prevention through a unique compound index
- Safe total-copy adjustments that respect already borrowed copies
- JWT verification using the Better Auth JWKS endpoint
- Restricted CORS, Helmet security headers, and structured request logging
- Environment and request validation with Zod
- Automated route and borrowing tests with Node Test Runner and Supertest

## Technology stack

- **Runtime:** Node.js 22+
- **API:** Express
- **Database:** MongoDB native driver and MongoDB Atlas
- **Authentication:** Better Auth JWT, JOSE, and remote JWKS
- **Validation:** Zod
- **Security:** Helmet and restricted CORS
- **Logging:** Morgan
- **Testing:** Node Test Runner and Supertest
- **Deployment:** Render

## API reference

Base URLs:

```text
Local:      http://localhost:5000
Production: https://booknook-server-xlsi.onrender.com
```

### Health check

**`GET /`** · Public

Confirms that the API service is running.

### Books

- **`GET /books`** · Public
  List books, newest first.
- **`GET /books?mine=true`** · Authenticated
  List books owned by the current reader.
- **`GET /books/:id`** · Public API
  Retrieve one book by MongoDB ObjectId.
- **`POST /books`** · Authenticated
  Add a validated book using the verified token identity.
- **`PATCH /books/:id`** · Owner only
  Update book fields or safely adjust the total copy count.
- **`DELETE /books/:id`** · Owner only
  Remove an owned book.

Supported `GET /books` query parameters:

- **`limit`** — Set the maximum number of records from `1` to `100`.
- **`category`** — Use `Fiction`, `Science`, `History`, `Kids`, or `Others`.
- **`search`** — Search by non-empty book title or author text.
- **`mine`** — Use `true` to return only the authenticated reader’s books.

### Borrows

- **`POST /borrows`** · Authenticated
  Borrow one available copy.
- **`GET /borrows`** · Authenticated
  List the current reader’s active borrows.
- **`DELETE /borrows/:id`** · Owner only
  Return a borrowed book and restore its copy.

`GET /books?mine=true` is protected behavior on the existing books route, not an additional resource endpoint.

## Authentication

Protected requests require a bearer token issued by the BookNook client:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The server validates the signature, issuer, and audience using the client’s JWKS endpoint. Ownership filters are built from the verified token identity.

## Local development

### Prerequisites

- Node.js 22 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection
- BookNook Client running on port `3000` for authentication

### Installation

```bash
git clone https://github.com/kamrullab/booknook-server.git
cd booknook-server
npm install
cp .env.example .env
```

Configure `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=booknook
CLIENT_URL=http://localhost:3000
AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
AUTH_ISSUER=http://localhost:3000
AUTH_AUDIENCE=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

Verify [http://localhost:5000](http://localhost:5000) before starting the client.

## Available commands

- **`npm run dev`** — Start with Node watch mode
- **`npm start`** — Start the production server
- **`npm run lint`** — Check JavaScript with ESLint
- **`npm test`** — Run API and borrowing tests

Recommended verification:

```bash
npm run lint
npm test
```

## Data integrity and security

- MongoDB indexes support newest-first listing and ownership queries.
- A unique partial index blocks duplicate active borrows for the same reader and book.
- Borrowing decrements `availableCopies` only when a copy remains.
- Returning restores availability and rolls back if the related book cannot be updated.
- Total copies cannot be reduced below the number currently borrowed.
- Request bodies are validated and unknown identity values cannot override the token user.
- CORS accepts only the configured `CLIENT_URL`.

## Render deployment

The included `render.yaml` defines the Node web service.

1. Create a Render Blueprint from this repository.
2. Add the production `MONGODB_URI`.
3. Set `CLIENT_URL` to `https://booknookbd.vercel.app`.
4. Set `AUTH_JWKS_URL` to `https://booknookbd.vercel.app/api/auth/jwks`.
5. Set `AUTH_ISSUER` and `AUTH_AUDIENCE` to `https://booknookbd.vercel.app`.
6. Deploy and confirm that the root health endpoint responds successfully.
7. Add the Render service URL to the client as `NEXT_PUBLIC_API_URL`.

## Related project

- [BookNook Client](https://github.com/kamrullab/booknook-client) — responsive Next.js interface and Better Auth service

## Production links

- API: [https://booknook-server-xlsi.onrender.com](https://booknook-server-xlsi.onrender.com)
- Website: [https://booknookbd.vercel.app](https://booknookbd.vercel.app)

---

Designed to keep every shared book, borrowed copy, and return safely accounted for.

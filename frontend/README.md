# GitHub-Confluence Connector UI

Modern Next.js dashboard for managing GitHub to Confluence connections.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

Edit `.env` and set:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001)

## Deployment

Deploy to Vercel or Railway:

```bash
npm run build
npm start
```

Make sure to set `NEXT_PUBLIC_API_URL` environment variable in your deployment platform.

# GitHub-Confluence Connector 🔗

Automatically update Confluence documentation when commits are pushed to GitHub. This connector uses a modern web UI where users authenticate once, then easily create repository-to-page connections. Webhooks are created automatically!

## Features

✅ **Automatic Webhook Creation** - No manual GitHub webhook setup required!  
✅ **Web Dashboard** - Beautiful UI for managing connections  
✅ **GitHub OAuth** - Secure token-based authentication  
✅ **Branch-Specific Mapping** - Map different branches to different pages  
✅ **Multi-Repository Support** - Handle unlimited repos from one deployment  
✅ **Real-time Sync** - Commit information instantly appears in Confluence  

## How It Works

1. User visits the web dashboard and connects GitHub (Personal Access Token)
2. User connects Confluence (API Token)
3. User selects a repository, branch, and Confluence page ID
4. Backend **automatically creates** the GitHub webhook
5. Future commits to that repo/branch → automatically update the Confluence page!

## Quick Start

### Backend Deployment (Railway)

1. Deploy this repo to Railway
2. Set environment variables:
   ```env
   PORT=3000
   GITHUB_WEBHOOK_SECRET=<generate-a-random-secret>
   RAILWAY_PUBLIC_DOMAIN=https://your-app.railway.app
   ```

Generate the webhook secret:
```bash
openssl rand -hex 32
```

### Frontend Deployment (Vercel)

1. Deploy the `frontend` folder to Vercel
2. The API URL is hardcoded in `frontend/app/page.tsx` - update if needed
3. That's it!

## User Guide

### First Time Setup

1. **Visit the dashboard** (your Vercel URL)
2. **Connect GitHub:**
   - Click "Connect GitHub"
   - Generate a Personal Access Token at: https://github.com/settings/tokens/new
   - Required scopes: `repo`, `admin:repo_hook`
   - Paste token and click Connect
3. **Connect Confluence:**
   - Click "Connect Confluence"
   - Enter your Atlassian domain (e.g., `https://company.atlassian.net`)
   - Enter your email
   - Generate API token at: https://id.atlassian.com/manage-profile/security/api-tokens
   - Paste token and click Connect

### Adding a Connection

1. Select a repository from the dropdown (auto-populated from your GitHub)
2. Enter the branch name (e.g., `main`, `develop`, or `*` for all branches)
3. Enter the Confluence Page ID:
   - Open your Confluence page
   - Click ••• → Page Information  
   - Copy the page ID from the URL: `/pages/viewinfo.action?pageId=XXXXXXXX`
4. Click "Add Connection"
5. ✅ Done! The webhook is automatically created in GitHub

### What Happens Next

Every time you push commits to the configured repository/branch:
- GitHub sends a webhook to your Railway backend
- Backend formats the commit information
- Confluence page is automatically updated with:
  - Timestamp
  - Repository and branch info
  - List of commits with links
  - Author information

## Project Structure

```
github-confluence-connector/
├── server.js                 # Main webhook server
├── lib/
│   └── confluence.js        # Confluence API client
├── config/
│   └── mapping.js           # Repository to page mappings
├── package.json
├── .env.example
## Project Structure

```
github-confluence-connector/
├── server.js                 # Main webhook server + API
├── lib/
│   └── confluence.js        # Confluence API client
├── config/
│   └── mapping.js           # Repository to page mappings (managed via API)
├── data/
│   └── user.json           # User tokens (auto-created, gitignored)
├── frontend/                # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx        # Main dashboard
│   │   ├── layout.tsx      # Layout wrapper
│   │   └── globals.css     # Vercel-style CSS
│   └── package.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Architecture

```
Frontend (Vercel)          Backend (Railway)         External Services
     │                          │                          │
     │  1. User connects        │                          │
     │     GitHub/Confluence    │                          │
     ├──────────────────────────>                          │
     │  POST /api/auth/*        │                          │
     │                          │  2. Verify & store       │
     │                          │     tokens in files      │
     │                          │                          │
     │  3. User adds connection │                          │
     ├──────────────────────────>                          │
     │  POST /api/connections   │                          │
     │                          │  4. Auto-create webhook  │
     │                          ├─────────────────────────> GitHub API
     │                          │     POST /repos/.../hooks │
     │                          │                          │
     │                          │  5. Push event occurs    │
     │                          │<──────────────────────── GitHub
     │                          │     POST /webhook/github │
     │                          │                          │
     │                          │  6. Update docs          │
     │                          ├─────────────────────────> Confluence API
     │                          │     PUT /content/{pageId}│
```

## Deployment

### Backend (Railway)

1. **Connect Repository**
   - Connect your GitHub repo to Railway
   - Railway will auto-detect Node.js and deploy `server.js`

2. **Set Environment Variables** (Only 2 required!)
   ```
   GITHUB_WEBHOOK_SECRET=your_secret_here
   RAILWAY_PUBLIC_DOMAIN=your-app.railway.app
   ```
   - Generate webhook secret: `openssl rand -hex 32`
   - Railway domain is provided by Railway automatically

3. **Deploy**
   - Railway auto-deploys on push to main branch
   - Backend will be available at `https://your-app.railway.app`

**Note:** Confluence and GitHub credentials are NOT set in environment variables. Users enter them through the web UI, and they're stored in `data/user.json`.

### Frontend (Vercel)

1. **Connect Repository**
   - Import your GitHub repo to Vercel
   - Select the `frontend` directory as root

2. **Set Environment Variable**
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app
   ```

3. **Deploy**
   - Vercel auto-deploys on push to main branch
   - Frontend will be available at `https://your-app.vercel.app`

### First-Time Setup After Deployment

1. Visit your Vercel frontend URL
2. Click "Connect GitHub" and paste your GitHub Personal Access Token (with `repo` + `admin:repo_hook` scopes)
3. Click "Connect Confluence" and enter your Confluence domain, email, and API token
4. Add connections: select repository → enter Confluence page ID → submit
5. Webhooks are automatically created in GitHub!

## API Endpoints

**Public:**
- `GET /` - Health check
- `POST /webhook/github` - GitHub webhook receiver (called by GitHub)

**Dashboard:**
- `GET /api/auth/status` - Check connection status
- `POST /api/auth/github` - Save GitHub token
- `POST /api/auth/confluence` - Save Confluence credentials
- `GET /api/github/repos` - List user's repositories
- `GET /api/connections` - List all connections
- `POST /api/connections` - Add new connection (auto-creates webhook!)
- `DELETE /api/connections` - Remove connection

## Customization

### Change Commit Format

Edit `buildUpdateContent()` in `server.js` to customize the HTML output:

```javascript
function buildUpdateContent(commits, repository, branch, pusher) {
  // Customize your HTML here
  let content = `<h3>Custom Format</h3>`;
  // ... your format
  return content;
}
```

### Update Strategy

By default, updates are appended. Modify `lib/confluence.js` to:
- `prependToPage()` - Add to top
- `updateSection()` - Update specific marked sections

## Troubleshooting

### "GitHub not connected" error
- Generate a new Personal Access Token
- Ensure it has `repo` and `admin:repo_hook` scopes
- Re-connect in the dashboard

### Webhook creation fails
- Verify the token has `admin:repo_hook` scope
- Check you have admin access to the repository
- Ensure `RAILWAY_PUBLIC_DOMAIN` is set correctly

### Confluence updates not working
- Verify API token is valid
- Check the user has edit permission on the page
- Confirm the page ID is correct

### Connection shows in dashboard but webhook missing in GitHub
- The webhook may have failed to create
- Check Railway logs for errors
- Manually verify in GitHub repo → Settings → Webhooks

## Security

- Tokens are stored server-side in files (not in database)
- Webhook signatures are validated using `GITHUB_WEBHOOK_SECRET`
- All API communication uses HTTPS
- Frontend hosted separately from backend
- Tokens never exposed to client
- Each user brings their own GitHub/Confluence credentials

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express
- **Deployment:** Vercel (frontend), Railway (backend)
- **Storage:** File-based (no database required)

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

---

**Built with ❤️ for better documentation workflows**


Made with ❤️ for better documentation workflows

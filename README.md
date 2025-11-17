# GitHub-Confluence Connector 🔗

Automatically update Confluence documentation when commits are pushed to GitHub. This webhook-based connector listens for GitHub push events and appends commit information to specified Confluence pages.

## Features

✅ **Automatic Updates** - Confluence pages update automatically when you push to GitHub  
✅ **Branch-Specific Mapping** - Map different branches to different Confluence pages  
✅ **Secure** - Validates GitHub webhook signatures  
✅ **Formatted Updates** - Clean, readable commit logs with links back to GitHub  
✅ **Easy Configuration** - Simple mapping file to connect repos to pages  

## How It Works

1. You push commits to GitHub
2. GitHub sends a webhook to your server
3. The connector processes the commits
4. Confluence page is automatically updated with commit details

## Prerequisites

- Node.js (v14 or higher)
- A GitHub repository with admin access (to configure webhooks)
- A Confluence account with API access
- A server or hosting environment to run the webhook listener

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
GITHUB_WEBHOOK_SECRET=your_secret_key_here

CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your_api_token_here
```

#### Getting Confluence API Token:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name and copy the token
4. Use your Atlassian email and this token in `.env`

### 3. Configure Repository Mappings

Edit `config/mapping.js` to map your GitHub repositories to Confluence pages:

```javascript
module.exports = {
  mappings: [
    {
      repository: 'your-org/your-repo',
      branch: 'main',
      confluencePageId: '123456789'
    }
  ]
};
```

#### Finding Confluence Page ID:

1. Open the Confluence page you want to update
2. Click the three dots (•••) menu → "Page Information"
3. The page ID is in the URL: `/pages/viewinfo.action?pageId=XXXXXXXX`

### 4. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on the port specified in `.env` (default: 3000).

### 5. Configure GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Set **Payload URL** to: `https://your-server-domain.com/webhook/github`
3. Set **Content type** to: `application/json`
4. Set **Secret** to the same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. Select **"Just the push event"** or choose individual events
6. Ensure **Active** is checked
7. Click "Add webhook"

#### Testing Locally with ngrok:

If testing locally, use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Use the ngrok URL (e.g., `https://abc123.ngrok.io/webhook/github`) as your GitHub webhook URL.

## Usage

Once configured, simply push commits to your mapped repositories:

```bash
git commit -m "Update documentation"
git push origin main
```

The Confluence page will automatically update with:
- Timestamp of the update
- Repository and branch information
- List of commits with links to GitHub
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
├── .gitignore
└── README.md
```

## Deployment

### Deploy to Heroku

```bash
heroku create your-app-name
heroku config:set GITHUB_WEBHOOK_SECRET=your_secret
heroku config:set CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
heroku config:set CONFLUENCE_EMAIL=your-email@example.com
heroku config:set CONFLUENCE_API_TOKEN=your_token
git push heroku main
```

### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Deploy to DigitalOcean/AWS/GCP

1. Set up a Node.js server
2. Clone the repository
3. Install dependencies: `npm install`
4. Configure environment variables
5. Use PM2 to run the server: `pm2 start server.js`
6. Set up nginx as a reverse proxy (optional)

## API Endpoints

- `GET /` - Health check endpoint
- `POST /webhook/github` - GitHub webhook receiver

## Customization

### Change Update Format

Modify the `buildUpdateContent()` function in `server.js` to customize how commit information is displayed in Confluence.

### Update Strategy

By default, updates are appended to the bottom of the page. You can modify `lib/confluence.js` to:
- Prepend updates (add to top)
- Update specific sections using markers
- Replace entire page content

Example for prepending:
```javascript
await confluenceClient.prependToPage(pageConfig.confluencePageId, updateContent);
```

## Troubleshooting

### Webhook not firing
- Check GitHub webhook delivery logs in GitHub settings
- Verify your server is publicly accessible
- Check server logs for errors

### Authentication errors
- Verify Confluence API token is correct
- Ensure the email matches your Atlassian account
- Check that the user has permission to edit the page

### Page not updating
- Verify the Confluence page ID is correct
- Check that mappings in `config/mapping.js` match your repository
- Look for errors in server logs

## Security Considerations

- Always use HTTPS in production
- Keep your webhook secret secure
- Regularly rotate API tokens
- Run the server with minimal permissions
- Consider rate limiting for high-traffic repositories

## Contributing

Feel free to submit issues and pull requests to improve this connector!

## License

MIT License - feel free to use this in your own projects.

## Support

For issues related to:
- GitHub webhooks: https://docs.github.com/en/webhooks
- Confluence API: https://developer.atlassian.com/cloud/confluence/rest/

---

Made with ❤️ for better documentation workflows

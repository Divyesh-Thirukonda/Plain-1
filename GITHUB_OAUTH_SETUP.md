# GitHub OAuth Setup

To enable GitHub authentication:

## 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: GitHub-Confluence Connector
   - **Homepage URL**: `https://your-vercel-app.vercel.app`
   - **Authorization callback URL**: `https://your-vercel-app.vercel.app/auth/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy it

## 2. For Personal Access Token (Simpler Alternative)

Instead of full OAuth, users can use Personal Access Tokens:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "Confluence Connector"
4. Select scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
5. Click "Generate token"
6. Copy the token

Users paste this token in the app.

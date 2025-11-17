const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const confluenceClient = require('./lib/confluence');
const config = require('./config/mapping');

const app = express();
const PORT = process.env.PORT || 3000;

// File paths
const USER_DATA_FILE = path.join(__dirname, 'data', 'user.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Helper to read user data
function getUserData() {
  if (!fs.existsSync(USER_DATA_FILE)) {
    const defaultData = { 
      githubToken: '', 
      githubUsername: '',
      confluenceEmail: '', 
      confluenceToken: '', 
      confluenceBaseUrl: '' 
    };
    writeUserData(defaultData);
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
}

// Helper to write user data
function writeUserData(data) {
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2));
}

// Helper to save user data
function saveUserData(data) {
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2));
}

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(bodyParser.json());

// Verify GitHub webhook signature
function verifyGitHubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('⚠️  GITHUB_WEBHOOK_SECRET not set - skipping signature verification');
    return next();
  }

  if (!signature) {
    return res.status(401).send('Missing signature header');
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  next();
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'GitHub-Confluence Connector',
    timestamp: new Date().toISOString()
  });
});

// API: Get user authentication status
app.get('/api/auth/status', (req, res) => {
  const userData = getUserData();
  res.json({
    githubConnected: !!userData.githubToken,
    confluenceConnected: !!(userData.confluenceEmail && userData.confluenceToken && userData.confluenceBaseUrl)
  });
});

// API: Save GitHub token
app.post('/api/auth/github', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    // Verify token and get username
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const userData = getUserData();
      userData.githubToken = token;
      userData.githubUsername = response.data.login;
      writeUserData(userData);

      res.json({ 
        success: true, 
        username: response.data.login 
      });
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid GitHub token' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save Confluence credentials
app.post('/api/auth/confluence', (req, res) => {
  try {
    const { email, token, baseUrl } = req.body;
    if (!email || !token || !baseUrl) {
      return res.status(400).json({ success: false, error: 'Email, token, and baseUrl required' });
    }

    const userData = getUserData();
    userData.confluenceEmail = email;
    userData.confluenceToken = token;
    userData.confluenceBaseUrl = baseUrl;
    saveUserData(userData);

    res.json({ success: true, message: 'Confluence credentials saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get user's GitHub repositories
app.get('/api/github/repos', async (req, res) => {
  try {
    const userData = getUserData();
    if (!userData.githubToken) {
      return res.status(401).json({ success: false, error: 'GitHub not connected' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `Bearer ${userData.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        per_page: 100,
        sort: 'updated',
        affiliation: 'owner,collaborator,organization_member'
      }
    });

    const repos = response.data.map(repo => ({
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private,
      url: repo.html_url
    }));

    res.json({ success: true, repos });
  } catch (error) {
    console.error('Error fetching repos:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get all connections
app.get('/api/connections', (req, res) => {
  try {
    const mappings = require('./config/mapping').mappings;
    res.json({ success: true, connections: mappings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Add new connection (with auto-webhook creation)
app.post('/api/connections', async (req, res) => {
  try {
    const { repository, branch, confluencePageId } = req.body;
    
    if (!repository || !branch || !confluencePageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: repository, branch, confluencePageId' 
      });
    }

    const userData = getUserData();
    if (!userData.githubToken) {
      return res.status(401).json({ success: false, error: 'GitHub not connected' });
    }

    // Read current mappings
    const configPath = path.join(__dirname, 'config', 'mapping.js');
    const currentConfig = require('./config/mapping');
    
    // Check for duplicates
    const exists = currentConfig.mappings.some(
      m => m.repository === repository && m.branch === branch
    );
    
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Connection already exists for this repository and branch' 
      });
    }

    // Create GitHub webhook
    try {
      const webhookUrl = `${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://plain-1-production.up.railway.app'}/webhook/github`;
      const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

      await axios.post(
        `https://api.github.com/repos/${repository}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: webhookSecret,
            insecure_ssl: '0'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${userData.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      console.log(`✅ Webhook created for ${repository}`);
    } catch (webhookError) {
      // If webhook already exists, that's okay
      if (webhookError.response?.status === 422) {
        console.log(`ℹ️  Webhook already exists for ${repository}`);
      } else {
        console.error('Error creating webhook:', webhookError.response?.data || webhookError.message);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to create webhook: ${webhookError.response?.data?.message || webhookError.message}` 
        });
      }
    }

    // Add new mapping
    currentConfig.mappings.push({ repository, branch, confluencePageId });
    
    // Write back to file
    const fileContent = `/**
 * Repository to Confluence Page Mappings
 * 
 * Configure which GitHub repositories/branches should update which Confluence pages.
 * Each mapping specifies:
 * - repository: Full repository name (owner/repo)
 * - branch: Branch name to monitor (use '*' for all branches)
 * - confluencePageId: The ID of the Confluence page to update
 * 
 * To find a Confluence page ID:
 * 1. Open the page in Confluence
 * 2. Click the three dots (•••) menu
 * 3. Select "Page Information"
 * 4. The page ID is in the URL: /pages/viewinfo.action?pageId=XXXXXXXX
 */

module.exports = {
  mappings: ${JSON.stringify(currentConfig.mappings, null, 4)}
};
`;
    
    fs.writeFileSync(configPath, fileContent);
    
    // Clear require cache to reload the updated file
    delete require.cache[require.resolve('./config/mapping')];
    
    res.json({ success: true, message: 'Connection added and webhook created successfully' });
  } catch (error) {
    console.error('Error adding connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Delete connection
app.delete('/api/connections', (req, res) => {
  try {
    const { repository, branch } = req.body;
    
    if (!repository || !branch) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: repository, branch' 
      });
    }

    // Read current mappings
    const configPath = path.join(__dirname, 'config', 'mapping.js');
    const currentConfig = require('./config/mapping');
    
    // Filter out the connection to delete
    const originalLength = currentConfig.mappings.length;
    currentConfig.mappings = currentConfig.mappings.filter(
      m => !(m.repository === repository && m.branch === branch)
    );
    
    if (currentConfig.mappings.length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        error: 'Connection not found' 
      });
    }

    // Write back to file
    const fileContent = `/**
 * Repository to Confluence Page Mappings
 * 
 * Configure which GitHub repositories/branches should update which Confluence pages.
 * Each mapping specifies:
 * - repository: Full repository name (owner/repo)
 * - branch: Branch name to monitor (use '*' for all branches)
 * - confluencePageId: The ID of the Confluence page to update
 * 
 * To find a Confluence page ID:
 * 1. Open the page in Confluence
 * 2. Click the three dots (•••) menu
 * 3. Select "Page Information"
 * 4. The page ID is in the URL: /pages/viewinfo.action?pageId=XXXXXXXX
 */

module.exports = {
  mappings: ${JSON.stringify(currentConfig.mappings, null, 4)}
};
`;
    
    fs.writeFileSync(configPath, fileContent);
    
    // Clear require cache
    delete require.cache[require.resolve('./config/mapping')];
    
    res.json({ success: true, message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GitHub webhook endpoint
app.post('/webhook/github', verifyGitHubSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  
  // Acknowledge receipt immediately
  res.status(200).send('Webhook received');

  console.log(`📥 Received GitHub event: ${event}`);

  // Handle push events
  if (event === 'push') {
    try {
      await handlePushEvent(req.body);
    } catch (error) {
      console.error('❌ Error handling push event:', error.message);
    }
  } else if (event === 'ping') {
    console.log('🏓 Received ping from GitHub');
  } else {
    console.log(`ℹ️  Ignoring event type: ${event}`);
  }
});

// Handle GitHub push events
async function handlePushEvent(payload) {
  const { repository, ref, commits, pusher } = payload;
  
  if (!commits || commits.length === 0) {
    console.log('ℹ️  No commits in push event');
    return;
  }

  const repoName = repository.full_name;
  const branch = ref.replace('refs/heads/', '');
  
  console.log(`\n📝 Processing push to ${repoName} on branch ${branch}`);
  console.log(`   ${commits.length} commit(s) by ${pusher.name}`);

  // Find matching Confluence page configuration
  const pageConfig = config.mappings.find(mapping => 
    mapping.repository === repoName && 
    (mapping.branch === branch || mapping.branch === '*')
  );

  if (!pageConfig) {
    console.log(`ℹ️  No Confluence mapping found for ${repoName}:${branch}`);
    return;
  }

  console.log(`✅ Found mapping to Confluence page ID: ${pageConfig.confluencePageId}`);

  // Build update content from commits
  const updateContent = buildUpdateContent(commits, repository, branch, pusher);

  // Update Confluence page
  try {
    await confluenceClient.appendToPage(pageConfig.confluencePageId, updateContent);
    console.log(`✅ Successfully updated Confluence page ${pageConfig.confluencePageId}`);
  } catch (error) {
    console.error(`❌ Failed to update Confluence:`, error.message);
    throw error;
  }
}

// Build formatted content from commits
function buildUpdateContent(commits, repository, branch, pusher) {
  const timestamp = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  let content = `<h3>Update from GitHub - ${timestamp}</h3>`;
  content += `<p><strong>Repository:</strong> <a href="${repository.html_url}">${repository.full_name}</a></p>`;
  content += `<p><strong>Branch:</strong> ${branch}</p>`;
  content += `<p><strong>Pushed by:</strong> ${pusher.name}</p>`;
  content += `<h4>Commits:</h4>`;
  content += `<ul>`;

  commits.forEach(commit => {
    const shortSha = commit.id.substring(0, 7);
    content += `<li>`;
    content += `<code>${shortSha}</code> - `;
    content += `<a href="${commit.url}">${commit.message.split('\n')[0]}</a>`;
    content += ` <em>by ${commit.author.name}</em>`;
    content += `</li>`;
  });

  content += `</ul>`;
  content += `<hr/>`;

  return content;
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 GitHub-Confluence Connector running on port ${PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook/github`);
  console.log(`\nConfiguration:`);
  console.log(`   Confluence: ${process.env.CONFLUENCE_BASE_URL || 'Not configured'}`);
  console.log(`   Webhook Secret: ${process.env.GITHUB_WEBHOOK_SECRET ? 'Set ✓' : 'Not set ⚠️'}`);
  console.log(`   Mappings: ${config.mappings.length} configured\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

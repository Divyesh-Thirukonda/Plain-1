const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const confluenceClient = require('./lib/confluence');
const config = require('./config/mapping');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON payloads
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

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ConfluenceClient {
  constructor() {
    // Try to load from user data file first, fallback to env
    this.loadCredentials();
  }

  loadCredentials() {
    const userDataPath = path.join(__dirname, '..', 'data', 'user.json');
    
    if (fs.existsSync(userDataPath)) {
      const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      this.baseURL = userData.confluenceBaseUrl || process.env.CONFLUENCE_BASE_URL;
      this.email = userData.confluenceEmail || process.env.CONFLUENCE_EMAIL;
      this.apiToken = userData.confluenceToken || process.env.CONFLUENCE_API_TOKEN;
    } else {
      this.baseURL = process.env.CONFLUENCE_BASE_URL;
      this.email = process.env.CONFLUENCE_EMAIL;
      this.apiToken = process.env.CONFLUENCE_API_TOKEN;
    }

    if (!this.baseURL || !this.email || !this.apiToken) {
      console.warn('⚠️  Confluence credentials not fully configured');
      return;
    }

    // Create axios instance with auth
    this.client = axios.create({
      baseURL: `${this.baseURL}/wiki/rest/api`,
      auth: {
        username: this.email,
        password: this.apiToken
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get page details by ID
   */
  async getPage(pageId) {
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: {
          expand: 'body.storage,version'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching page ${pageId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update page content
   */
  async updatePage(pageId, newContent, newVersion) {
    try {
      const response = await this.client.put(`/content/${pageId}`, {
        version: { number: newVersion },
        title: newContent.title,
        type: 'page',
        body: {
          storage: {
            value: newContent.body,
            representation: 'storage'
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating page ${pageId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Append content to a Confluence page
   */
  async appendToPage(pageId, htmlContent) {
    // Reload credentials in case they changed
    this.loadCredentials();
    
    if (!this.client) {
      throw new Error('Confluence not configured. Please set up Confluence credentials.');
    }
    
    console.log(`📄 Fetching current page content for page ${pageId}...`);
    
    // Get current page content
    const page = await this.getPage(pageId);
    
    const currentBody = page.body.storage.value;
    const currentVersion = page.version.number;
    
    // Append new content
    const updatedBody = currentBody + '\n' + htmlContent;
    
    console.log(`📝 Updating page (version ${currentVersion} → ${currentVersion + 1})...`);
    
    // Update the page
    await this.updatePage(pageId, {
      title: page.title,
      body: updatedBody
    }, currentVersion + 1);
    
    return true;
  }

  /**
   * Prepend content to a Confluence page
   */
  async prependToPage(pageId, htmlContent) {
    console.log(`📄 Fetching current page content for page ${pageId}...`);
    
    const page = await this.getPage(pageId);
    const currentBody = page.body.storage.value;
    const currentVersion = page.version.number;
    
    // Prepend new content
    const updatedBody = htmlContent + '\n' + currentBody;
    
    console.log(`📝 Updating page (version ${currentVersion} → ${currentVersion + 1})...`);
    
    await this.updatePage(pageId, {
      title: page.title,
      body: updatedBody
    }, currentVersion + 1);
    
    return true;
  }

  /**
   * Replace a section in a Confluence page
   * Looks for content between markers and replaces it
   */
  async updateSection(pageId, sectionMarker, newContent) {
    const page = await this.getPage(pageId);
    const currentBody = page.body.storage.value;
    const currentVersion = page.version.number;

    const startMarker = `<!-- ${sectionMarker}_START -->`;
    const endMarker = `<!-- ${sectionMarker}_END -->`;

    let updatedBody;
    
    if (currentBody.includes(startMarker) && currentBody.includes(endMarker)) {
      // Replace existing section
      const startIdx = currentBody.indexOf(startMarker);
      const endIdx = currentBody.indexOf(endMarker) + endMarker.length;
      
      updatedBody = currentBody.substring(0, startIdx) +
                   startMarker + '\n' + newContent + '\n' + endMarker +
                   currentBody.substring(endIdx);
    } else {
      // Add section at the end
      updatedBody = currentBody + '\n' + 
                   startMarker + '\n' + newContent + '\n' + endMarker;
    }

    await this.updatePage(pageId, {
      title: page.title,
      body: updatedBody
    }, currentVersion + 1);

    return true;
  }
}

module.exports = new ConfluenceClient();

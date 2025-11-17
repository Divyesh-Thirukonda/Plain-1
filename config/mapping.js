/**
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
  mappings: [
    // Example mapping - replace with your actual configuration
    {
      repository: 'your-org/your-repo',
      branch: 'main',
      confluencePageId: '123456789'
    },
    {
      repository: 'your-org/your-repo',
      branch: 'develop',
      confluencePageId: '987654321'
    },
    // Monitor all branches for a repository
    {
      repository: 'your-org/another-repo',
      branch: '*',
      confluencePageId: '111222333'
    }
  ]
};

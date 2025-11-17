'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://plain-1-production.up.railway.app";

interface Connection {
  repository: string;
  branch: string;
  confluencePageId: string;
}

interface Repo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  url: string;
}

interface AuthStatus {
  githubConnected: boolean;
  confluenceConnected: boolean;
}

export default function Home() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ githubConnected: false, confluenceConnected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [confluencePageId, setConfluencePageId] = useState('');
  const [adding, setAdding] = useState(false);

  // Auth state
  const [showGitHubAuth, setShowGitHubAuth] = useState(false);
  const [showConfluenceAuth, setShowConfluenceAuth] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [confluenceEmail, setConfluenceEmail] = useState('');
  const [confluenceToken, setConfluenceToken] = useState('');
  const [confluenceBaseUrl, setConfluenceBaseUrl] = useState('');

  useEffect(() => {
    fetchAuthStatus();
    fetchConnections();
  }, []);

  useEffect(() => {
    if (authStatus.githubConnected) {
      fetchRepos();
    }
  }, [authStatus.githubConnected]);

  const fetchAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/status`);
      setAuthStatus(response.data);
    } catch (err: any) {
      console.error('Error fetching auth status:', err);
    }
  };

  const fetchRepos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/github/repos`);
      setRepos(response.data.repos || []);
    } catch (err: any) {
      console.error('Error fetching repos:', err);
    }
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/connections`);
      setConnections(response.data.connections);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/auth/github`, { token: githubToken });
      setAuthStatus({ ...authStatus, githubConnected: true });
      setShowGitHubAuth(false);
      setGithubToken('');
      await fetchRepos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect GitHub');
    }
  };

  const handleConnectConfluence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/auth/confluence`, {
        email: confluenceEmail,
        token: confluenceToken,
        baseUrl: confluenceBaseUrl
      });
      setAuthStatus({ ...authStatus, confluenceConnected: true });
      setShowConfluenceAuth(false);
      setConfluenceEmail('');
      setConfluenceToken('');
      setConfluenceBaseUrl('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect Confluence');
    }
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repository || !branch || !confluencePageId) {
      setError('All fields are required');
      return;
    }

    try {
      setAdding(true);
      setError('');
      await axios.post(`${API_URL}/api/connections`, {
        repository,
        branch,
        confluencePageId
      });
      
      // Reset form
      setRepository('');
      setBranch('main');
      setConfluencePageId('');
      
      // Refresh connections
      await fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteConnection = async (repo: string, branch: string) => {
    if (!confirm(`Delete connection for ${repo}:${branch}?`)) return;

    try {
      await axios.delete(`${API_URL}/api/connections`, {
        data: { repository: repo, branch }
      });
      await fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            GitHub-Confluence Connector
          </h1>
          <p className="text-slate-300 text-lg">
            Connect your GitHub repositories to automatically update Confluence pages
          </p>
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-8">
            {error}
            <button onClick={() => setError('')} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {/* Authentication Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* GitHub Auth */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </h3>
              {authStatus.githubConnected ? (
                <span className="text-green-400 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected
                </span>
              ) : (
                <span className="text-slate-400 text-sm">Not connected</span>
              )}
            </div>
            {!authStatus.githubConnected && !showGitHubAuth && (
              <button
                onClick={() => setShowGitHubAuth(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Connect GitHub
              </button>
            )}
            {!authStatus.githubConnected && showGitHubAuth && (
              <form onSubmit={handleConnectGitHub} className="space-y-3">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="GitHub Personal Access Token"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-xs text-slate-400">
                  Create token at: <a href="https://github.com/settings/tokens/new?scopes=repo,admin:repo_hook" target="_blank" className="text-blue-400 underline">github.com/settings/tokens</a>
                  <br/>Required scopes: <code className="bg-slate-900 px-1 rounded">repo</code>, <code className="bg-slate-900 px-1 rounded">admin:repo_hook</code>
                </p>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    Connect
                  </button>
                  <button type="button" onClick={() => setShowGitHubAuth(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Confluence Auth */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Confluence
              </h3>
              {authStatus.confluenceConnected ? (
                <span className="text-green-400 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected
                </span>
              ) : (
                <span className="text-slate-400 text-sm">Not connected</span>
              )}
            </div>
            {!authStatus.confluenceConnected && !showConfluenceAuth && (
              <button
                onClick={() => setShowConfluenceAuth(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Connect Confluence
              </button>
            )}
            {!authStatus.confluenceConnected && showConfluenceAuth && (
              <form onSubmit={handleConnectConfluence} className="space-y-3">
                <input
                  type="url"
                  value={confluenceBaseUrl}
                  onChange={(e) => setConfluenceBaseUrl(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <input
                  type="email"
                  value={confluenceEmail}
                  onChange={(e) => setConfluenceEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <input
                  type="password"
                  value={confluenceToken}
                  onChange={(e) => setConfluenceToken(e.target.value)}
                  placeholder="Confluence API Token"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-xs text-slate-400">
                  Create token at: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" className="text-purple-400 underline">Atlassian API Tokens</a>
                </p>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    Connect
                  </button>
                  <button type="button" onClick={() => setShowConfluenceAuth(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Add Connection Form - Only show if both services are connected */}
        {authStatus.githubConnected && authStatus.confluenceConnected && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-8 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="bg-blue-500 w-2 h-8 mr-3 rounded"></span>
            Add New Connection
          </h2>
          
          <form onSubmit={handleAddConnection} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GitHub Repository
                </label>
                <select
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select a repository</option>
                  {repos.map(repo => (
                    <option key={repo.fullName} value={repo.fullName}>
                      {repo.fullName} {repo.private && '🔒'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">{repos.length} repositories available</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Or use * for all branches</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confluence Page ID
                </label>
                <input
                  type="text"
                  value={confluencePageId}
                  onChange={(e) => setConfluencePageId(e.target.value)}
                  placeholder="123456789"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Find in page info</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {adding ? 'Adding...' : 'Add Connection'}
            </button>
          </form>
          </div>
        )}

        {/* Connections List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center justify-between">
            <span className="flex items-center">
              <span className="bg-purple-500 w-2 h-8 mr-3 rounded"></span>
              Active Connections
            </span>
            <span className="text-sm font-normal text-slate-400">
              {connections.length} total
            </span>
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500"></div>
              <p className="text-slate-400 mt-4">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-slate-400 text-lg">No connections yet</p>
              <p className="text-slate-500 text-sm mt-2">Add your first connection above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Repository</p>
                        <p className="font-mono text-blue-400">{conn.repository}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Branch</p>
                        <p className="font-mono text-purple-400">{conn.branch}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Confluence Page</p>
                        <p className="font-mono text-green-400">{conn.confluencePageId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteConnection(conn.repository, conn.branch)}
                      className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg"
                      title="Delete connection"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="font-semibold text-blue-300 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to find your Confluence Page ID
          </h3>
          <ol className="text-sm text-slate-300 space-y-1 ml-7 list-decimal">
            <li>Open the Confluence page you want to update</li>
            <li>Click the three dots (•••) menu in the top right</li>
            <li>Select "Page Information"</li>
            <li>The page ID is in the URL: <code className="bg-slate-900 px-2 py-1 rounded text-blue-300">/pages/viewinfo.action?pageId=XXXXXXXX</code></li>
          </ol>
        </div>
      </div>
    </main>
  );
}

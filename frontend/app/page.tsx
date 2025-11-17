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
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#333] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">GitHub → Confluence</h1>
            <p className="text-sm text-[#888] mt-1">Sync commits to documentation</p>
          </div>
          <div className="flex items-center gap-3">
            {authStatus.githubConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#333] text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[#888]">GitHub</span>
              </div>
            )}
            {authStatus.confluenceConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#333] text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[#888]">Confluence</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 px-4 py-3 rounded-lg border border-red-900/50 bg-red-900/10 text-red-400 text-sm flex items-center justify-between animate-fade-in">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Authentication Section */}
        {(!authStatus.githubConnected || !authStatus.confluenceConnected) && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Get Started</h2>
            <p className="text-[#888] mb-6">Connect your accounts to begin syncing</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GitHub Auth Card */}
              <div className="border border-[#333] rounded-lg p-6 hover:border-[#555] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">GitHub</h3>
                      <p className="text-sm text-[#888]">
                        {authStatus.githubConnected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {authStatus.githubConnected && (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {!authStatus.githubConnected && !showGitHubAuth && (
                  <button
                    onClick={() => setShowGitHubAuth(true)}
                    className="w-full px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-[#fafafa] transition-colors"
                  >
                    Connect GitHub
                  </button>
                )}

                {!authStatus.githubConnected && showGitHubAuth && (
                  <form onSubmit={handleConnectGitHub} className="space-y-3 animate-fade-in">
                    <div>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="Personal Access Token"
                        className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                        required
                      />
                      <p className="text-xs text-[#666] mt-2">
                        Generate at <a href="https://github.com/settings/tokens/new?scopes=repo,admin:repo_hook" target="_blank" className="text-white hover:underline">github.com/settings/tokens</a>
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        Scopes: <code className="text-[#888]">repo</code>, <code className="text-[#888]">admin:repo_hook</code>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-[#fafafa] transition-colors"
                      >
                        Connect
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowGitHubAuth(false)} 
                        className="px-4 py-2 border border-[#333] rounded-md text-sm hover:border-[#555] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Confluence Auth Card */}
              <div className="border border-[#333] rounded-lg p-6 hover:border-[#555] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0052CC] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.866l-1.572 1.572a.5.5 0 0 1-.707 0l-3.722-3.722a.5.5 0 0 1 0-.707l1.572-1.572a.5.5 0 0 1 .707 0l3.722 3.722a.5.5 0 0 1 0 .707zm-8.901-4.973l-1.572-1.572a.5.5 0 0 1 0-.707l3.722-3.722a.5.5 0 0 1 .707 0l1.572 1.572a.5.5 0 0 1 0 .707L9.7 9.893a.5.5 0 0 1-.707 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Confluence</h3>
                      <p className="text-sm text-[#888]">
                        {authStatus.confluenceConnected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {authStatus.confluenceConnected && (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {!authStatus.confluenceConnected && !showConfluenceAuth && (
                  <button
                    onClick={() => setShowConfluenceAuth(true)}
                    className="w-full px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-[#fafafa] transition-colors"
                  >
                    Connect Confluence
                  </button>
                )}

                {!authStatus.confluenceConnected && showConfluenceAuth && (
                  <form onSubmit={handleConnectConfluence} className="space-y-3 animate-fade-in">
                    <input
                      type="url"
                      value={confluenceBaseUrl}
                      onChange={(e) => setConfluenceBaseUrl(e.target.value)}
                      placeholder="https://your-domain.atlassian.net"
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <input
                      type="email"
                      value={confluenceEmail}
                      onChange={(e) => setConfluenceEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <input
                      type="password"
                      value={confluenceToken}
                      onChange={(e) => setConfluenceToken(e.target.value)}
                      placeholder="API Token"
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <p className="text-xs text-[#666]">
                      Create at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" className="text-white hover:underline">Atlassian</a>
                    </p>
                    <div className="flex gap-2">
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-[#fafafa] transition-colors"
                      >
                        Connect
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowConfluenceAuth(false)} 
                        className="px-4 py-2 border border-[#333] rounded-md text-sm hover:border-[#555] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Connection Form */}
        {authStatus.githubConnected && authStatus.confluenceConnected && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Add Connection</h2>
            <p className="text-[#888] mb-6">Create a new sync between your repository and Confluence page</p>
            
            <div className="border border-[#333] rounded-lg p-6">
              <form onSubmit={handleAddConnection} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-2">
                      Repository
                    </label>
                    <select
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    >
                      <option value="">Select repository</option>
                      {repos.map(repo => (
                        <option key={repo.fullName} value={repo.fullName}>
                          {repo.fullName} {repo.private && '🔒'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[#666] mt-1">{repos.length} available</p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#888] mb-2">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <p className="text-xs text-[#666] mt-1">or * for all branches</p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#888] mb-2">
                      Confluence Page ID
                    </label>
                    <input
                      type="text"
                      value={confluencePageId}
                      onChange={(e) => setConfluencePageId(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 bg-black border border-[#333] rounded-md text-sm focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <p className="text-xs text-[#666] mt-1">from page info</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-[#fafafa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding Connection...' : 'Add Connection'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Connections List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Connections</h2>
              <p className="text-[#888] text-sm mt-1">{connections.length} active sync{connections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 border border-[#333] rounded-lg">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#333] border-t-white"></div>
              <p className="text-[#888] mt-4 text-sm">Loading...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-20 border border-[#333] rounded-lg border-dashed">
              <svg className="mx-auto h-12 w-12 text-[#333] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[#888]">No connections yet</p>
              <p className="text-[#666] text-sm mt-1">Create your first sync above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((conn, index) => (
                <div
                  key={index}
                  className="border border-[#333] rounded-lg p-4 hover:border-[#555] transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-[#666] mb-1">Repository</p>
                        <p className="text-sm font-mono">{conn.repository}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#666] mb-1">Branch</p>
                        <p className="text-sm font-mono">{conn.branch}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#666] mb-1">Page ID</p>
                        <p className="text-sm font-mono">{conn.confluencePageId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteConnection(conn.repository, conn.branch)}
                      className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-md"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-[#666] hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="mt-12 border border-[#333] rounded-lg p-6 bg-[#111]">
          <h3 className="font-medium mb-3 flex items-center text-sm">
            <svg className="w-4 h-4 mr-2 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finding your Confluence Page ID
          </h3>
          <ol className="text-sm text-[#888] space-y-2 ml-6 list-decimal">
            <li>Open your Confluence page</li>
            <li>Click the three dots (•••) → "Page Information"</li>
            <li>Find the ID in the URL: <code className="text-xs bg-black border border-[#333] px-2 py-0.5 rounded">/pages/viewinfo.action?pageId=XXXXXXXX</code></li>
          </ol>
        </div>
      </div>
    </main>
  );
}

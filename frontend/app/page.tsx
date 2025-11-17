'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Connection {
  repository: string;
  branch: string;
  confluencePageId: string;
}

export default function Home() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [confluencePageId, setConfluencePageId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

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
            Manage your repository connections to Confluence documentation
          </p>
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Add Connection Form */}
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
                <input
                  type="text"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  placeholder="owner/repo-name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">e.g., microsoft/vscode</p>
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

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Activity, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [skip, setSkip] = useState(0);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filterAction, filterResource, skip],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (filterResource) params.append('resource', filterResource);
      params.append('skip', skip.toString());
      params.append('take', '50');

      const response = await api.get(`/api/audit-search-settings/audit/logs?${params}`);
      return response.data;
    },
  });

  const { data: stats = {} } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const response = await api.get('/api/audit-search-settings/audit/stats');
      return response.data;
    },
  });

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const response = await api.get(`/api/audit-search-settings/audit/search?query=${encodeURIComponent(searchQuery)}`);
      // Handle search results
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--ok)' };
      case 'UPDATE':
        return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--in)' };
      case 'DELETE':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--er)' };
      case 'LOGIN':
        return { bg: 'rgba(139, 92, 246, 0.1)', color: 'var(--pu)' };
      case 'LOGOUT':
        return { bg: 'rgba(255, 255, 255, 0.06)', color: 'var(--t2)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.06)', color: 'var(--t2)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">Audit Logs</h1>
        <p className="pg-sh">Track all system activities and changes</p>
      </div>

      {/* Stats */}
      <div className="g3">
        <div className="stat card">
          <p className="stat-lbl">Total Logs</p>
          <p className="stat-val">{stats.totalLogs || 0}</p>
        </div>
        <div className="stat card">
          <p className="stat-lbl">Actions Tracked</p>
          <p className="stat-val">{Object.keys(stats.actionCounts || {}).length}</p>
        </div>
        <div className="stat card">
          <p className="stat-lbl">Resources Modified</p>
          <p className="stat-val">{Object.keys(stats.resourceCounts || {}).length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '16px', fontFamily: 'var(--f1)' }}>
          Search & Filter
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
              <input
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="inp"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            <button onClick={handleSearch} className="btn bp btn-sm">
              <Search size={14} />
              Search
            </button>
          </div>

          <div className="g2">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="sel"
            >
              <option value="">All Actions</option>
              {Object.keys(stats.actionCounts || {}).map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="sel"
            >
              <option value="">All Resources</option>
              {Object.keys(stats.resourceCounts || {}).map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--f1)' }}>
            Activity Logs
          </h2>
          <button className="btn bg btn-sm">
            <Download size={14} />
            Export
          </button>
        </div>

        <div style={{ padding: '16px', overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--t2)' }}>
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--t2)' }}>
              No audit logs found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map((log: AuditLog) => {
                const actionColor = getActionColor(log.action);
                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '9px',
                      border: '1px solid var(--bd)',
                      background: 'var(--c2)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--bd2)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bd)'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Activity size={14} style={{ color: 'var(--t2)' }} />
                        <div
                          className="badge"
                          style={{
                            background: actionColor.bg,
                            color: actionColor.color,
                            fontSize: '10px',
                          }}
                        >
                          {log.action}
                        </div>
                        <div
                          className="badge"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--t2)',
                            fontSize: '10px',
                          }}
                        >
                          {log.resource}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
                          {log.resourceId}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                          {log.user.fullName}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--t2)' }}>
                          {log.user.email}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--t3)' }}>
                      <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p>{new Date(log.createdAt).toLocaleTimeString()}</p>
                      {log.ipAddress && <p style={{ marginTop: '4px' }}>{log.ipAddress}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
            <button
              onClick={() => setSkip(Math.max(0, skip - 50))}
              disabled={skip === 0}
              className="btn bg btn-sm"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>
              Showing {skip + 1} - {skip + logs.length}
            </span>
            <button
              onClick={() => setSkip(skip + 50)}
              disabled={logs.length < 50}
              className="btn bg btn-sm"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, ShieldAlert, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, AlertOctagon } from 'lucide-react';
import { adminListAuditLogs, AuditLogEntry } from '../api';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Pagination states
  const [limit, setLimit] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // Client-side quick filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLogsData = async (shouldShowSpinner = false) => {
    if (shouldShowSpinner) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      // Calculate offset based on current page
      const offset = (page - 1) * limit;
      // Fetch logs representing current page index
      const data = await adminListAuditLogs(limit, offset);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve administrative security event audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogsData(true);
  }, [limit, page]);

  // Handle term filter
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.email.toLowerCase().includes(term) ||
      log.name.toLowerCase().includes(term) ||
      log.status.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const norm = status.toUpperCase();
    if (norm.includes('SUCCESS')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          SUCCESS
        </span>
      );
    } else if (norm.includes('FAIL') || norm.includes('ERROR') || norm.includes('MOCK_FAIL')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-500" />
          FAILED
        </span>
      );
    } else if (norm.includes('BLOCK') || norm.includes('SUSPICIOUS')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <AlertOctagon className="w-3 h-3 text-amber-500" />
          BLOCKED
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">
          <Clock className="w-3 h-3 text-gray-500" />
          {status}
        </span>
      );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6" id="admin-audit-logs-card">
      {/* Alert Error Box */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest">Administrative Error</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Control bar / Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Reset to page 1 on client filters to avoid empty viewport offsets
              if (page !== 1) setPage(1);
            }}
            placeholder="Search auditing events by email, status, name, details..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        {/* Refresh & Pagination settings */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-550 select-none">Show</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchLogsData(false)}
            disabled={refreshing || loading}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 font-semibold text-gray-700 shadow-xs cursor-pointer"
            title="Reload Security Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-gray-500 font-medium">Retrieving security event log stream...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">No Auditable Entries</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              {searchTerm ? 'No local events matched your search filter.' : 'The SQLite logins table is currently empty.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-600 font-bold tracking-wider select-none">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">User email</th>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Status Code</th>
                  <th className="px-6 py-4 font-semibold">Sec/Context Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-500 text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                      {log.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {log.name || 'Anonymous User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details || <span className="text-gray-400 italic font-normal">None recorded</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Page Controls */}
        {!loading && total > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-medium text-gray-500 select-none">
            <span>
              Showing <span className="font-bold text-gray-800">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-bold text-gray-800">{total}</span> critical incidents.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="p-1 px-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-45 disabled:pointer-events-none transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-gray-600">
                Page <span className="font-bold text-gray-800">{page}</span> of <span className="font-bold text-[#111827]">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page === totalPages || loading}
                className="p-1 px-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-45 disabled:pointer-events-none transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

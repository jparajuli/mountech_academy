import React, { useState, useEffect } from 'react';
import { adminGetPendingPayments, adminApprovePayment, PendingPayment } from '../api';
import { Clock, ShieldCheck, AlertCircle, RefreshCw, Check, Info } from 'lucide-react';

export default function AdminPaymentsPortal() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminGetPendingPayments();
      if (res.success) {
        setPendingPayments(res.payments || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending manual bank payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleApprove = async (id: number, email: string) => {
    setActionLoading(id);
    setError('');
    setSuccessMessage('');
    try {
      const res = await adminApprovePayment(id);
      if (res.success) {
        setSuccessMessage(`Approved payment successfully! Course access is now unlocked for ${email}.`);
        // Refresh the local pending payment table
        await loadPayments();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve enrollment payment.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 overflow-hidden animate-fade-in" id="admin-payments-portal-main">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-4 border-b border-gray-100 gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Pending Bank Transfers Verification</span>
          </h2>
          <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">
            Validate manual bank deposits. Compare reference memos with your bank statement, then click Approve to unlock student classrooms.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayments}
          disabled={loading}
          className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 bg-white border border-[#e5e7eb] hover:bg-gray-50 rounded-lg shadow-2xs cursor-pointer select-none flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs" id="bank-approve-success">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span className="font-semibold leading-normal">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-150 text-red-800 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs" id="bank-approve-error">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <span className="font-semibold leading-normal">{error}</span>
        </div>
      )}

      {/* Content Body */}
      {loading && pendingPayments.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[#0070f3] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-gray-400">Locking transaction query filters...</span>
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="py-12 bg-[#f9fafb] rounded-xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center space-y-2.5 p-6 shadow-2xs">
          <ShieldCheck className="w-9 h-9 text-gray-300" />
          <div>
            <h4 className="text-xs font-bold text-gray-800">No Pending Bank Transfers</h4>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs mx-auto leading-relaxed">
              All registered manual bank transfer enrollments are currently verified and unlocked.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-150">
          <table className="min-w-full divide-y divide-gray-150 text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 font-mono text-left uppercase tracking-wider border-b border-gray-200">
                <th className="px-4 py-3 text-left">Student Info</th>
                <th className="px-4 py-3 text-left">Course Details</th>
                <th className="px-4 py-3 text-center">Memo Reference</th>
                <th className="px-4 py-3 text-right">Amount (Tuition)</th>
                <th className="px-4 py-3 text-center">Date Requested</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans text-xs bg-white">
              {pendingPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-gray-50/50 transition-all" id={`pay-row-${pay.id}`}>
                  {/* Student info */}
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-gray-900 leading-tight">{pay.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5 select-all">{pay.email}</div>
                  </td>

                  {/* Course info */}
                  <td className="px-4 py-3.5 font-medium text-gray-850">
                    <div className="line-clamp-1">{pay.courseTitle}</div>
                    <div className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">Access Block ID: {pay.courseId}</div>
                  </td>

                  {/* Alphanumeric Memo Reference */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 border border-indigo-150 font-bold font-mono text-indigo-700 text-xs select-all">
                      {pay.payment_reference}
                    </span>
                  </td>

                  {/* Bill Amount */}
                  <td className="px-4 py-3.5 text-right font-semibold">
                    <div className="text-gray-900 font-mono text-[11px] font-bold">NPR {((pay.price || 49) * 133).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">USD ${pay.price || 49}</div>
                  </td>

                  {/* Date requested */}
                  <td className="px-4 py-3.5 text-center text-gray-500 font-mono text-[10px]">
                    {new Date(pay.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  {/* Approve button */}
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleApprove(pay.id, pay.email)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-3xs hover:shadow-2xs inline-flex items-center gap-1 transition-all select-none"
                    >
                      {actionLoading === pay.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification instructions panel */}
      <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0070f3] mt-0.5 shrink-0" />
        <div className="space-y-1 text-[11px] leading-relaxed text-gray-600">
          <strong className="block text-gray-900 font-semibold uppercase font-sans text-[10px] tracking-wider">🔒 Standard Operating Verification Protocol</strong>
          <span>Ensure that the customer's submitted <strong>Unique Reference Code</strong> matches exactly with your clearing bank statement notes. Double check value currency equivalence conversions before click approvals to release certification courses securely.</span>
        </div>
      </div>
    </div>
  );
}

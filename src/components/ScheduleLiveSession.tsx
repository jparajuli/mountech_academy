import React, { useState } from 'react';
import { User } from '../types';
import { Video, Activity, Plus, ShieldAlert } from 'lucide-react';
import { scheduleLiveSession } from '../api';

interface ScheduleLiveSessionProps {
  user: User;
  courseId: string;
  onScheduleSuccess?: () => void;
  onCancel?: () => void;
}

export const ScheduleLiveSession: React.FC<ScheduleLiveSessionProps> = ({
  user,
  courseId,
  onScheduleSuccess,
  onCancel,
}) => {
  const isAuthorized = user.role === 'instructor' || user.role === 'admin';

  if (!isAuthorized) {
    return (
      <div className="p-8 bg-red-55 border border-red-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3" id="permission-denied-fallback">
        <ShieldAlert className="w-12 h-12 text-red-600 animate-bounce" />
        <h3 className="text-lg font-bold text-red-800">Permission Denied</h3>
        <p className="text-sm text-red-600 max-w-md">
          Only authorized educators and site administrators are permitted to schedule or alter Mountech Academy Live Seminar sessions.
        </p>
      </div>
    );
  }

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setScheduleSuccess('');
    setScheduleError('');

    try {
      // Convert local date inputs to UTC ISO strings
      const startIso = new Date(sessionStart).toISOString();
      const endIso = new Date(sessionEnd).toISOString();

      const res = await scheduleLiveSession(courseId, {
        title: sessionTitle || 'Live Online Class Session',
        start_time: startIso,
        end_time: endIso,
      });

      if (res.success) {
        setScheduleSuccess(`Course lecture session "${sessionTitle}" successfully scheduled!`);
        setSessionTitle('');
        setSessionStart('');
        setSessionEnd('');
        if (onScheduleSuccess) {
          onScheduleSuccess();
        }
        setTimeout(() => setScheduleSuccess(''), 4000);
      }
    } catch (err: any) {
      setScheduleError(err?.message || 'Unable to schedule live class seminar.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 space-y-4 shadow-3xs animate-fade-in" id="live-session-scheduler-card">
      <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            <span>Schedule Live Class Seminar</span>
          </h3>
          <p className="text-[11px] text-[#6b7280] mt-0.5">
            Publish a new scheduled lecture room session for registered scholars in this elective.
          </p>
        </div>
        <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-md">
          🔒 Secure Jitsi Classroom auto-provisioned
        </span>
      </div>

      {scheduleError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <span className="shrink-0">⚠️</span>
          <span>{scheduleError}</span>
        </div>
      )}
      {scheduleSuccess && (
        <div className="p-3 bg-emerald-55 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <span className="shrink-0">✓</span>
          <span>{scheduleSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
            Lecture / Seminar Session Title *
          </label>
          <input
            type="text"
            required
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="e.g. Q&A and Exam Review with Sarah Sterling"
            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
              Start Date & Time (Local) *
            </label>
            <input
              type="datetime-local"
              required
              value={sessionStart}
              onChange={(e) => setSessionStart(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
              End Date & Time (Local) *
            </label>
            <input
              type="datetime-local"
              required
              value={sessionEnd}
              onChange={(e) => setSessionEnd(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
            />
          </div>
        </div>

        <div className="bg-rose-50/50 border border-rose-100/60 p-3 rounded-lg flex items-start gap-2.5">
          <div className="p-1 bg-rose-500 text-white rounded-full">
            <Video className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-[#111827] text-[11px]">Automated WebRTC Provisioning</span>
            <p className="text-[#4b5563] text-[10px] leading-normal">
              A dedicated, encrypted Jitsi meet-room will be automatically configured for this session ID. Students can join instantly without copying URLs.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={scheduling}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
          >
            {scheduling ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Schedule Live Lecture
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

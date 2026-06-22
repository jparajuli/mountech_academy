import React, { useState, useEffect } from 'react';
import { adminGetStudentsOverview, StudentDossier, CourseEnrollmentDossier } from '../api';
import { 
  Search, Filter, Clock, AlertCircle, CheckCircle, Download, User, 
  Calendar, TrendingUp, X, ChevronRight, Coins, Award, BookOpen, 
  ShieldAlert, Check, RefreshCw, FileText
} from 'lucide-react';

export default function AdminStudentMatrix() {
  const [students, setStudents] = useState<StudentDossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_payment' | 'completed' | 'graduate' | 'high_achiever'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentDossier | null>(null);

  const fetchDossiers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminGetStudentsOverview();
      setStudents(res.dossiers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to aggregate scholar profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, []);

  // Filter students based on search query and status filter selection
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pending_payment') {
      return student.overallStats.hasPendingPayment;
    }
    if (statusFilter === 'completed') {
      // Completed at least one course but not certified yet
      return student.enrollments.some(e => e.enrollmentStatus === 'Completed');
    }
    if (statusFilter === 'graduate') {
      return student.overallStats.overallStatus === 'Graduate';
    }
    if (statusFilter === 'high_achiever') {
      return student.overallStats.overallStatus === 'High Achiever';
    }

    return true;
  });

  return (
    <div className="space-y-6" id="admin-student-matrix-wrapper">
      {/* Search and Filters Header */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0070f3]" />
            <span>Academic Matrix & Student Lifecycles</span>
          </h2>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Real-time telemetry monitor mapping course enrollment status, payment processing verification states, and granular final exam metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-60 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none appearance-none cursor-pointer text-gray-700 font-medium"
            >
              <option value="all">All Lifecycles</option>
              <option value="pending_payment">Pending Payments</option>
              <option value="completed">Incomplete Grads (Final Exam Passed)</option>
              <option value="graduate">Certified Graduates</option>
              <option value="high_achiever">High Achievers (Avg &gt; 85%)</option>
            </select>
            <Filter className="w-3 h-3 text-gray-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Refresh Tool */}
          <button
            type="button"
            onClick={fetchDossiers}
            disabled={loading}
            className="p-1.5 bg-gray-100 hover:bg-gray-250 disabled:opacity-50 text-gray-700 rounded-lg cursor-pointer transition-all border border-gray-200"
            title="Reload student lifecycles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Matrix Data Table */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-150 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <span className="font-semibold leading-normal">{error}</span>
        </div>
      )}

      {loading && students.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-3 border-[#0070f3] border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs text-gray-400 font-mono block">Syncing student logs and SQLite ledger entries...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-2.5 shadow-xs">
          <User className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-xs font-bold text-gray-800">No Student Matches</h3>
          <p className="text-[11px] text-gray-400 max-w-sm mx-auto leading-relaxed">
            Your search parameters did not yield any students. Try adjusting filters or searching by a different name or email.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-xs text-left" id="admin-academic-matrix-table">
              <thead>
                <tr className="bg-[#f9fafb] text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-3.5">Student Information</th>
                  <th className="px-6 py-3.5 text-center">Registrations</th>
                  <th className="px-6 py-3.5 text-center">Exams Passed</th>
                  <th className="px-6 py-3.5 text-center">Average Score</th>
                  <th className="px-6 py-3.5 text-center">Payment Alerts</th>
                  <th className="px-6 py-3.5">Overall Lifecycle</th>
                  <th className="px-6 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white" id="admin-academic-matrix-body">
                {filteredStudents.map((stud) => {
                  // Calculate average exam completion progress
                  const total = stud.enrollments.length;
                  const completed = stud.enrollments.filter(e => e.enrollmentStatus === 'Certified' || e.enrollmentStatus === 'Completed').length;
                  const percentProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr 
                      key={stud.email} 
                      onClick={() => setSelectedStudent(stud)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      {/* Student Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-705 text-xs font-mono">
                            {stud.name ? stud.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block leading-tight">{stud.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono block select-all mt-0.5">{stud.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Registrations count */}
                      <td className="px-6 py-4 text-center font-semibold text-gray-800">
                        {stud.enrollments.length}
                      </td>

                      {/* Exams Passed */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-150">
                          {stud.overallStats.totalExamsPassed} exams
                        </span>
                      </td>

                      {/* Average Score */}
                      <td className="px-6 py-4 text-center font-mono text-[11px]">
                        <span className={`font-bold ${
                          stud.overallStats.averageScoreAll >= 85 ? 'text-emerald-600' :
                          stud.overallStats.averageScoreAll >= 70 ? 'text-[#0070f3]' :
                          stud.overallStats.averageScoreAll > 0 ? 'text-amber-500' : 'text-gray-400'
                        }`}>
                          {stud.overallStats.averageScoreAll > 0 ? `${stud.overallStats.averageScoreAll}%` : '—'}
                        </span>
                      </td>

                      {/* Payment Alerts */}
                      <td className="px-6 py-4 text-center">
                        {stud.overallStats.hasPendingPayment ? (
                          <span className="inline-flex items-center gap-1 text-red-650 bg-red-50 border border-red-150 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Pending Ref
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-[10px]">Clear</span>
                        )}
                      </td>

                      {/* Overall Progress & Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 max-w-[150px]">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className={`font-bold uppercase tracking-wider ${
                              stud.overallStats.overallStatus === 'Graduate' ? 'text-indigo-600' :
                              stud.overallStats.overallStatus === 'High Achiever' ? 'text-emerald-600' :
                              stud.overallStats.overallStatus === 'Active Student' ? 'text-[#0070f3]' : 'text-gray-400'
                            }`}>
                              {stud.overallStats.overallStatus}
                            </span>
                            <span className="text-gray-500 font-mono">{percentProgress}%</span>
                          </div>
                          {/* Progress Line */}
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-150">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                stud.overallStats.overallStatus === 'Graduate' ? 'bg-indigo-600' :
                                stud.overallStats.overallStatus === 'High Achiever' ? 'bg-emerald-500' :
                                'bg-[#0070f3]'
                              }`}
                              style={{ width: `${percentProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Chevron Action */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 font-semibold font-mono">
                          <span>Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL SLIDE-OVER MODAL LAYER */}
      {selectedStudent && (
        <div 
          className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-xs flex justify-end transition-opacity duration-300 animate-fade-in"
          onClick={() => setSelectedStudent(null)}
          id="student-academic-slide-over"
        >
          <div 
            className="w-full max-w-2xl bg-white h-screen shadow-2xl flex flex-col relative overflow-hidden animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="p-6 border-b border-gray-150 bg-[#f9fafb] flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold font-mono shadow-md">
                  {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0070f3] uppercase tracking-wider block">Student Academic Record</span>
                  <h2 className="text-base font-black text-gray-900">{selectedStudent.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-mono">
                    <span className="select-all">{selectedStudent.email}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(selectedStudent.joinedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-all"
                id="close-slideover-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Highlight Aggregations Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-gray-400 block">Total Enrolled</span>
                  <div className="flex items-center gap-1.5 font-sans">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-base font-black text-gray-950 font-mono">{selectedStudent.overallStats.totalEnrollments} Courses</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-gray-400 block">Overall Score</span>
                  <div className="flex items-center gap-1.5 font-sans">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-base font-black text-emerald-700 font-mono">
                      {selectedStudent.overallStats.averageScoreAll > 0 ? `${selectedStudent.overallStats.averageScoreAll}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-gray-400 block">System Badge</span>
                  <div className="flex items-center gap-1.5 font-sans">
                    <Award className="w-4 h-4 text-indigo-600 animate-bounce" />
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      {selectedStudent.overallStats.overallStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visually Break Down Enrolled Courses */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="text-[11px] font-extrabold uppercase text-gray-400 font-mono tracking-widest">Enrolled Course Dossiers</h3>
                </div>

                {selectedStudent.enrollments.length === 0 ? (
                  <div className="py-8 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200 text-gray-400 text-xs">
                    This user is not enrolled in any professional certificate courses.
                  </div>
                ) : (
                  selectedStudent.enrollments.map((enr) => {
                    const statusColors = {
                      'Pending Verification': 'bg-amber-50 text-amber-700 border-amber-200',
                      'Active': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Completed': 'bg-teal-50 text-teal-700 border-teal-200',
                      'Certified': 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    };

                    return (
                      <div key={enr.courseId} className="border border-gray-250 rounded-xl p-4 space-y-4.5 bg-white shadow-3xs" id={`detail-course-${enr.courseId}`}>
                        {/* Course Name Header and Status Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-gray-50 pb-3">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Course Registry</span>
                            <h4 className="text-xs font-black text-gray-901 leading-snug">{enr.courseTitle}</h4>
                            <span className="text-[9px] font-mono text-gray-400 block">Enrolled on {new Date(enr.enrolledAt).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusColors[enr.enrollmentStatus]}`}>
                              {enr.enrollmentStatus}
                            </span>
                          </div>
                        </div>

                        {/* Payment Status details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Payment Verification</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              {enr.paymentStatus === 'completed' ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                              )}
                              <span className="font-bold text-gray-800 uppercase text-[10px]">
                                {enr.paymentStatus === 'completed' ? 'Cleared & Verified' : 'Awaiting SWIFT/Bank Receipt'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 block mt-0.5 capitalize">via {enr.paymentMethod}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Transaction Reference</span>
                            <div className="mt-1 font-mono font-bold text-gray-800 text-[10px] break-all select-all">
                              {enr.paymentReference ? (
                                <span className="bg-white border px-1.5 py-0.5 rounded border-gray-200">
                                  {enr.paymentReference}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic font-sans font-normal">No reference logged</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Exam Timeline Attempts list */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Chronological Exam Telemetry</span>
                          {enr.attempts.length === 0 ? (
                            <div className="py-4 text-center text-gray-400 text-[10px] bg-gray-50/50 rounded-lg border border-dashed border-gray-150">
                              No assessment or chapter exams attempted yet for this curriculum.
                            </div>
                          ) : (
                            <div className="relative pl-4 border-l-2 border-slate-200 space-y-3 pt-1">
                              {enr.attempts.map((att: any, attIdx: number) => (
                                <div key={att.id || attIdx} className="relative" id={`attempt-dossier-${att.id}`}>
                                  {/* Milestone Icon dot */}
                                  <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-full border-2 ${
                                    att.passed ? 'bg-emerald-500 border-white' : 'bg-rose-500 border-white'
                                  }`} />
                                  <div className="text-[11px] leading-relaxed">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="font-extrabold text-slate-800">{att.title}</span>
                                      <span className="text-[10px] text-gray-450 font-mono">
                                        {new Date(att.date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-450 mt-0.5">
                                      <span className={`font-bold ${att.passed ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-rose-700 bg-rose-50 px-1 rounded'}`}>
                                        Score: {att.score}% ({att.passed ? 'Passed' : 'Failed'})
                                      </span>
                                      <span>•</span>
                                      <span className="capitalize font-mono text-[9px] text-slate-400 uppercase tracking-wider">{att.type} assessment</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Final LifeCycle Milestone Stamps */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-[11.5px]">
                          {/* Final Exam Passed Stamp */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Final Exam Passed:</span>
                            {enr.courseCompletedAt || enr.finalExamStatus === 'Passed' ? (
                              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10.5px]">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Passed Final Exam</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-gray-400 italic text-[10.5px]">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Not Passed Yet</span>
                              </div>
                            )}
                          </div>

                          {/* Certificate download stamp */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Certificate Authenticated:</span>
                            {enr.certificateDownloadedAt ? (
                              <div className="flex items-center gap-1.5 text-indigo-800 font-bold text-[10.5px]">
                                <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Claimed & Downloaded</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-gray-400 italic text-[10.5px]">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>Not Yet Claimed</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}

              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-[#f9fafb] border-t border-gray-150 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-gray-900 border border-transparent hover:bg-black font-semibold text-xs text-white rounded-xl shadow-xs cursor-pointer select-none font-mono uppercase tracking-wider text-center"
              >
                Close Record View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

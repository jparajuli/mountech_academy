import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Linkedin, RefreshCw, AlertTriangle, CheckCircle, GraduationCap, Search, UserCheck } from 'lucide-react';
import { InstructorProfile } from '../types';
import { fetchInstructors, createInstructorProfileAdmin, updateInstructorProfileApi, adminListUsers } from '../api';

export const ManageInstructors: React.FC = () => {
  const [profiles, setProfiles] = useState<InstructorProfile[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbSyncing, setDbSyncing] = useState<boolean>(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Mode state
  const [editingProfile, setEditingProfile] = useState<InstructorProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Form Fields States
  const [userEmail, setUserEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [academicTitle, setAcademicTitle] = useState<string>('');
  const [shortBio, setShortBio] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  const syncData = async () => {
    setDbSyncing(true);
    setErrorMessage('');
    try {
      const [profilesRes, usersRes] = await Promise.all([
        fetchInstructors(),
        adminListUsers()
      ]);

      if (profilesRes && profilesRes.success) {
        setProfiles(profilesRes.profiles);
      }
      if (usersRes && usersRes.users) {
        setUsers(usersRes.users);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to synchronize instructor cache directory.");
    } finally {
      setLoading(false);
      setDbSyncing(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const resetForm = () => {
    setUserEmail('');
    setFullName('');
    setAcademicTitle('');
    setShortBio('');
    setLinkedinUrl('');
    setAvatarUrl('');
    setEditingProfile(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!userEmail.trim() || !fullName.trim() || !academicTitle.trim()) {
      setErrorMessage("Please fill in all strictly required fields (*).");
      return;
    }

    try {
      if (shortBio.length > 500) {
        throw new Error("Bio has a maximum capacity constraint of 500 characters.");
      }
      if (linkedinUrl.trim() && !linkedinUrl.startsWith('http://') && !linkedinUrl.startsWith('https://')) {
        throw new Error("A valid URL starting with http:// or https:// is required for LinkedIn.");
      }
      if (avatarUrl.trim() && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        throw new Error("A valid URL starting with http:// or https:// is required for avatar.");
      }

      const res = await createInstructorProfileAdmin({
        user_email: userEmail.trim().toLowerCase(),
        full_name: fullName.trim(),
        academic_title: academicTitle.trim(),
        short_bio: shortBio.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined
      });

      if (res && res.success) {
        setSuccessMessage(`Faculty profile for "${fullName}" has been successfully configured and linked to ${userEmail.trim().toLowerCase()}.`);
        resetForm();
        setShowCreateForm(false);
        await syncData();
        setTimeout(() => setSuccessMessage(''), 6000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Internal transaction error during creation.");
    }
  };

  const handleStartEdit = (profile: InstructorProfile) => {
    setEditingProfile(profile);
    setUserEmail(profile.user_email);
    setFullName(profile.full_name);
    setAcademicTitle(profile.academic_title);
    setShortBio(profile.short_bio || '');
    setLinkedinUrl(profile.linkedin_url || '');
    setAvatarUrl(profile.avatar_url || '');
    setShowCreateForm(true);
    // Smooth scroll to card
    document.getElementById("admin-instructor-builder-card")?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim() || !academicTitle.trim()) {
      setErrorMessage("Please fill in all strictly required fields (*).");
      return;
    }

    try {
      if (shortBio.length > 500) {
        throw new Error("Bio exceeds the 500 character ceiling.");
      }
      if (linkedinUrl.trim() && !linkedinUrl.startsWith('http://') && !linkedinUrl.startsWith('https://')) {
        throw new Error("LinkedIn address must start with http:// or https://");
      }
      if (avatarUrl.trim() && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        throw new Error("Avatar image address must start with http:// or https://");
      }

      const res = await updateInstructorProfileApi(editingProfile.id, {
        full_name: fullName.trim(),
        academic_title: academicTitle.trim(),
        short_bio: shortBio.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined
      });

      if (res && res.success) {
        setSuccessMessage(`Credentials updated successfully for ${fullName}.`);
        resetForm();
        setShowCreateForm(false);
        await syncData();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Execution error during update save.");
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const search = searchTerm.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(search) ||
      p.user_email.toLowerCase().includes(search) ||
      p.academic_title.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-gray-400 font-mono flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <span>Loading academic faculty profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="manage-instructors-view">
      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-55 border border-emerald-150 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-150 text-red-800 text-xs font-semibold rounded-lg flex items-start gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Builder Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search faculty name, email, credentials..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncData}
            disabled={dbSyncing}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-[#e5e7eb] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${dbSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (showCreateForm) {
                resetForm();
                setShowCreateForm(false);
              } else {
                resetForm();
                setShowCreateForm(true);
              }
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0070f3] hover:bg-[#0070f3]/90 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showCreateForm ? 'View Faculty Grid' : 'Assign Faculty profile'}</span>
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-3xs space-y-4 animate-fade-in" id="admin-instructor-builder-card">
          <div className="border-b border-gray-150 pb-2.5">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>{editingProfile ? 'Edit Instructor Profile Schema' : 'Assign New Instructor Profile mapping'}</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {editingProfile ? 'Edit fields below. Note that emails cannot be altered after link initialization.' : 'Configure official profile parameters and bind securely onto a registered user email.'}
            </p>
          </div>

          <form onSubmit={editingProfile ? handleUpdateSubmit : handleCreateSubmit} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
                  Registered User Email *
                </label>
                {editingProfile ? (
                  <input
                    type="email"
                    disabled
                    value={userEmail}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-[#e5e7eb] rounded-lg text-gray-400 font-mono font-semibold cursor-not-allowed"
                  />
                ) : (
                  <div className="space-y-1">
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. instructor@mountech.academy"
                      className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] font-mono"
                      list="registered-emails-datalist"
                    />
                    <datalist id="registered-emails-datalist">
                      {users.map((u) => (
                        <option key={u.email} value={u.email}>{u.name} ({u.role})</option>
                      ))}
                    </datalist>
                    <p className="text-[9px] text-gray-400">
                      Tip: Input must belong to a pre-registered scholar. Selecting will elevate student roles automatically.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
                  Faculty Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Prof. Jhanak Sterling"
                  className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
                  Academic Credentials / Title *
                </label>
                <input
                  type="text"
                  required
                  value={academicTitle}
                  onChange={(e) => setAcademicTitle(e.target.value)}
                  placeholder="e.g. Dr. of Artificial Intelligence, Oxford Fellow"
                  className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="e.g. https://linkedin.com/in/educator"
                  className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
                Avatar Profile Photo Link
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="e.g. https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
                className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-gray-700 tracking-wider uppercase">
                  Biography / Bio Description
                </label>
                <span className={`text-[9.5px] font-mono ${shortBio.length > 450 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {500 - shortBio.length} Characters capacity remaining
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="Briefly state industrial context, expertise parameters under 500 characters..."
                className="w-full px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] font-sans resize-y"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowCreateForm(false);
                }}
                className="px-4 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer"
              >
                <span>{editingProfile ? 'Save Changes' : 'Initialize Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-xl py-12 text-center" id="empty-instructors-state">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-extrabold text-[#111827] uppercase tracking-wider">No faculty profiles found</p>
          <p className="text-[11px] text-[#6b7280] mt-1 max-w-sm mx-auto">
            Try adjusting search constraints or click the &quot;Assign Faculty profile&quot; button to allocate details.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden" id="faculty-catalog-directory">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
              Live Academic Faculty Registry ({filteredProfiles.length})
            </h4>
            <span className="text-[9.5px] font-mono uppercase bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded font-bold">
              High-Availability Row Index
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 font-mono text-left uppercase tracking-wider">
                  <th className="px-5 py-3 text-[#6b7280]">Educator & Email</th>
                  <th className="px-5 py-3 text-[#6b7280]">Credentials & Bio Preview</th>
                  <th className="px-5 py-3 text-right text-[#6b7280]">Action Toggles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-xs">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-all" id={`profile-row-tr-${p.id}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[11px]">
                            {p.full_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {p.full_name}
                            {p.linkedin_url && (
                              <a
                                href={p.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-400 hover:text-[#0077b5]"
                              >
                                <Linkedin className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400">{p.user_email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-indigo-600 font-mono uppercase tracking-wider">
                          {p.academic_title}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1 italic">
                          {p.short_bio || 'No biographic mapping declared.'}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="px-2.5 py-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageInstructors;

import React, { useState, useEffect, useRef } from 'react';
import { Save, User, Linkedin, RefreshCw, AlertTriangle, CheckCircle, GraduationCap, Image as ImageIcon } from 'lucide-react';
import { User as UserType, InstructorProfile } from '../types';
import { fetchInstructorByEmail, updateInstructorProfileApi } from '../api';

interface MyProfileSettingsProps {
  user: UserType;
}

export const MyProfileSettings: React.FC<MyProfileSettingsProps> = ({ user }) => {
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorInput, setErrorInput] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form Fields State
  const [fullName, setFullName] = useState<string>('');
  const [academicTitle, setAcademicTitle] = useState<string>('');
  const [shortBio, setShortBio] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Reference to manage timeout cleanup safely
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setErrorInput('');
    setSuccessMsg('');
    try {
      const res = await fetchInstructorByEmail(user.email);
      if (res && res.success && res.profile) {
        setProfile(res.profile);
        setFullName(res.profile.full_name || '');
        setAcademicTitle(res.profile.academic_title || '');
        setShortBio(res.profile.short_bio || '');
        setLinkedinUrl(res.profile.linkedin_url || '');
        setAvatarUrl(res.profile.avatar_url || '');
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.warn("No profile found or error fetching", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    // Cleanup timeout when component unmounts
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user.email]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setErrorInput('');
    setSuccessMsg('');

    try {
      // Basic validations
      if (!fullName.trim() || !academicTitle.trim()) {
        throw new Error("Full Name and Academic Title are strictly required fields.");
      }
      if (shortBio.length > 500) {
        throw new Error("Biography description exceeds the maximum length constraint of 500 characters.");
      }

      if (linkedinUrl.trim() && !linkedinUrl.startsWith('http://') && !linkedinUrl.startsWith('https://')) {
        throw new Error("A valid URL starting with http:// or https:// is required for LinkedIn.");
      }
      if (avatarUrl.trim() && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        throw new Error("A valid URL starting with http:// or https:// is required for your avatar picture.");
      }

      const res = await updateInstructorProfileApi(profile.id, {
        full_name: fullName.trim(),
        academic_title: academicTitle.trim(),
        short_bio: shortBio.trim(),
        linkedin_url: linkedinUrl.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });

      // FIX: Handle explicit API or business logic rejections
      if (res && res.success) {
        setSuccessMsg("Your professional faculty profile has been securely saved!");
        setProfile(res.profile);
        setFullName(res.profile.full_name);
        setAcademicTitle(res.profile.academic_title);
        setShortBio(res.profile.short_bio);
        setLinkedinUrl(res.profile.linkedin_url || '');
        setAvatarUrl(res.profile.avatar_url || '');
        
        // Safe timeout execution
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        throw new Error(res?.message || "The core registrar failed to index modifications.");
      }
    } catch (err: any) {
      setErrorInput(err?.message || "An unresolved error occurred while saving modifications.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-gray-500 font-mono tracking-wider">SECURELY RESOLVING INSTRUCTOR CREDENTIALS...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm p-12 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Faculty Profile Pending Provisioning</h3>
        <p className="text-[11px] text-gray-500 leading-relaxed max-w-md mx-auto">
          Your account holds the <strong className="text-indigo-600 font-mono tracking-wide uppercase">instructor</strong> role. However, your display profile remains unallocated in the active registrar cache database.
        </p>
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left text-[11px] leading-relaxed text-slate-600 space-y-1.5">
          <div className="font-bold text-slate-800">What to do next:</div>
          <p>Please contact an Academic Board Admin member to create and assign your official instructor profile linked to your email address: <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-gray-250 font-mono text-rose-600 text-[10px]">{user.email}</code></p>
        </div>
      </div>
    );
  }

  const bioRemaining = 500 - shortBio.length;

  return (
    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6 animate-fade-in" id="instructor-profile-settings-card">
      <div className="border-b border-gray-150 pb-4">
        <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
          Faculty Personal Dashboard
        </span>
        <h2 className="text-lg font-extrabold text-[#111827] mt-2 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-500" />
          Manage Faculty Profile
        </h2>
        <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">
          Update your public profile display card which is synchronized automatically on all active digital class syllabus lists.
        </p>
      </div>

      {errorInput && (
        <div className="p-3.5 bg-red-50 border border-red-150 rounded-xl text-red-800 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">Execution Blocked</div>
            <p className="text-[11px] text-red-700/90 leading-relaxed">{errorInput}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">Synchronization Complete</div>
            <p className="text-[11px] text-emerald-700/90 leading-relaxed">{successMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6 text-xs">
        {/* Core details row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Arthur Vance"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
              Academic Title / Credentials *
            </label>
            <input
              type="text"
              required
              value={academicTitle}
              onChange={(e) => setAcademicTitle(e.target.value)}
              placeholder="e.g. Lead DevSecOps Fellow"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Links & Avatar Row with Live Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5 flex items-center gap-1">
              <Linkedin className="w-3.5 h-3.5 text-gray-400" />
              <span>LinkedIn Profile URL</span>
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="e.g. https://linkedin.com/in/arthurvance"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
              Avatar Image Public URL
            </label>
            <div className="flex items-center gap-3">
              {/* ENHANCEMENT: Live Avatar Preview Panel */}
              <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center shadow-3xs">
                {avatarUrl.trim() && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) ? (
                  <img 
                    src={avatarUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="e.g. https://images.com/avatar.jpg"
                className="flex-1 px-3.5 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Bio row with live counter */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase">
              Biography Description
            </label>
            <span className={`text-[9px] font-mono font-bold uppercase ${bioRemaining < 50 ? 'text-rose-600' : 'text-gray-400'}`}>
              {bioRemaining} Characters Remaining
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={500}
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            placeholder="Share your background, industry experience, and professional expertise milestones..."
            className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans resize-y leading-relaxed"
          ></textarea>
        </div>

        {/* Submissions buttons */}
        <div className="flex justify-end pt-3 border-t border-gray-150">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Credentials...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Faculty Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MyProfileSettings;
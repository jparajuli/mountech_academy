import React from 'react';
import { Linkedin, User } from 'lucide-react';
import { InstructorProfile } from '../types';

interface InstructorCardProps {
  profile: InstructorProfile;
}

export const InstructorCard: React.FC<InstructorCardProps> = ({ profile }) => {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm"
      id={`instructor-card-${profile.id}`}
    >
      <div className="p-6 flex items-start gap-4">
        {/* Avatar Area */}
        <div className="shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-gray-200 bg-gray-50"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-bold text-sm tracking-wide">
              {initials || <User className="w-5 h-5 text-indigo-500" />}
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-gray-900 truncate">
              {profile.full_name}
            </h4>
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#0077b5] transition-colors shrink-0"
                title={`${profile.full_name}'s LinkedIn page`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
          
          <div className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-wider">
            {profile.academic_title}
          </div>

          {profile.short_bio ? (
            <p className="text-[11px] text-gray-500 leading-relaxed font-sans line-clamp-3">
              {profile.short_bio}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 italic font-sans leading-relaxed">
              No biological description provided.
            </p>
          )}

          <div className="pt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[9px] font-mono uppercase font-bold text-gray-400 tracking-wider">
              Faculty Member • {profile.user_email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorCard;

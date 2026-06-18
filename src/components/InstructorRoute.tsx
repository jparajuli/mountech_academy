import React from 'react';
import { User } from '../types';

interface InstructorRouteProps {
  user: User | null;
  children: React.ReactNode;
}

export default function InstructorRoute({ user, children }: InstructorRouteProps) {
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-55/5 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full border border-gray-100 text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Unauthorized</h2>
          <p className="text-sm text-gray-500 mb-6">Please log in to your instructor account to proceed.</p>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new Event('popstate'));
            }}
            className="w-full bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer text-sm"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'instructor' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-55/5 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full border border-gray-100 text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Instructor Access Required</h2>
          <p className="text-sm text-gray-500 mb-6">
            This workspace is reserved for authorized instructors. Your current role is <strong className="capitalize">{user.role}</strong>.
          </p>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new Event('popstate'));
            }}
            className="w-full bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer text-sm"
          >
            Return to Student Catalog
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

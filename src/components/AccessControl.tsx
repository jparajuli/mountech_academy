import React from 'react';
import { User } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export type Role = 'admin' | 'instructor' | 'student';

interface AccessControlProps {
  user: User | null;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Robust Custom Hook for frontend role assertions.
 */
export function useRBAC(user: User | null) {
  const role = user?.role || 'student';
  
  const hasRole = (allowed: Role | Role[]): boolean => {
    if (role === 'admin') return true;
    if (Array.isArray(allowed)) {
      return allowed.includes(role);
    }
    return role === allowed;
  };

  return {
    role,
    hasRole,
    isAdmin: role === 'admin',
    isInstructor: role === 'instructor',
    isStudent: role === 'student',
  };
}

/**
 * Access Control wrapper component for surgical UI visibility.
 */
export const AccessControl: React.FC<AccessControlProps> = ({ 
  user, 
  allowedRoles, 
  fallback = null, 
  children 
}) => {
  const { hasRole } = useRBAC(user);

  if (!user || !hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * High-fidelity HOC to securely encapsulate administrative dashboard pages.
 */
export function withAccessControl<P extends { user: User | null }>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function ProtectedComponent(props: P) {
    const { hasRole } = useRBAC(props.user);

    if (!props.user || !hasRole(allowedRoles)) {
      return (
        <div 
          id="access-restricted-screen"
          className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center bg-[#050a14] border border-slate-900 rounded-3xl shadow-2xl space-y-6 max-w-2xl mx-auto"
        >
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <span className="font-mono text-[10px] text-rose-500 font-black uppercase tracking-widest block">
              SECURE BOUNDARY REACHED
            </span>
            <h3 className="text-xl font-black text-slate-100 tracking-tight">
              Access Restricted
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
              Your institutional credentials as a <span className="font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded text-[10px] uppercase">{props.user?.role || 'student'}</span> do not grant access to this administrative control workspace.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-900 p-3.5 rounded-xl text-left w-full max-w-sm space-y-1.5 font-mono text-[10px] text-gray-500">
            <div className="flex justify-between">
              <span>Required Roles:</span>
              <span className="text-indigo-400 font-bold">{allowedRoles.join(" | ").toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-t border-slate-900/60 pt-1.5">
              <span>Auditable IP Status:</span>
              <span className="text-emerald-500 font-semibold">SECURE PROXY LINKED</span>
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-gray-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors rounded-xl font-mono text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

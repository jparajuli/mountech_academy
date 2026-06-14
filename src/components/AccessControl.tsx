import React from 'react';
import { User } from '../types';

interface AccessControlProps {
  user: User | null;
  allowedRoles: ('admin' | 'instructor' | 'student' | 'developer')[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// 1. Custom Hook for Role-Based checks
export function useRBAC(user: User | null) {
  const role = user?.role || 'student';
  
  const hasRole = (allowed: ('admin' | 'instructor' | 'student' | 'developer') | ('admin' | 'instructor' | 'student' | 'developer')[]) => {
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
    isDeveloper: role === 'developer',
    isStudent: role === 'student',
  };
}

// 2. Access Control Wrapper Component
export function AccessControl({ user, allowedRoles, fallback = null, children }: AccessControlProps) {
  const { hasRole } = useRBAC(user);

  if (!user || !hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// 3. Higher-Order Component (HOC) for protecting full views
export function withAccessControl<P extends { user: User | null }>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: ('admin' | 'instructor' | 'student' | 'developer')[]
) {
  return function ProtectedComponent(props: P) {
    const { hasRole } = useRBAC(props.user);

    if (!props.user || !hasRole(allowedRoles)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white border border-rose-100 rounded-2xl shadow-sm">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl mb-4 border border-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m-3.343-5.657L3.929 17.2a2 2 0 001.414 3.414h13.314a2 2 0 001.414-3.414l-4.728-4.728A2 2 0 0012 12a2 2 0 00-3.343.343z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Access Restricted</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-2 leading-relaxed">
            Your current institutional role (<span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded text-[10px]">{props.user?.role || 'student'}</span>) is insufficient to access these administrative command boards.
          </p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

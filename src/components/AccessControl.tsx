import React from 'react';
import { User } from '../types';

// 1. Centralized Role Type (DRY Principle)
export type Role = 'admin' | 'instructor' | 'student' | 'developer';

interface AccessControlProps {
  user: User | null;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// 2. Custom Hook for Role-Based checks
export function useRBAC(user: User | null) {
  // SECURITY FIX: Default to null for unauthenticated users, not 'student'
  const role = user?.role || null;
  
  const hasRole = (allowed: Role | Role[]) => {
    if (!role) return false;
    
    // ENTERPRISE PATTERN: Super-users implicitly bypass specific UI restrictions
    if (role === 'admin' || role === 'developer') return true;

    if (Array.isArray(allowed)) {
      return allowed.includes(role as Role);
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
    isAuthenticated: !!role // Helpful bonus flag!
  };
}

// 3. Access Control Wrapper Component (For UI Elements like Buttons)
export function AccessControl({ user, allowedRoles, fallback = null, children }: AccessControlProps) {
  const { hasRole, isAuthenticated } = useRBAC(user);

  if (!isAuthenticated || !hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// 4. Higher-Order Component (For protecting full Page Views)
export function withAccessControl<P extends { user: User | null }>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function ProtectedComponent(props: P) {
    const { hasRole, isAuthenticated } = useRBAC(props.user);

    if (!isAuthenticated || !hasRole(allowedRoles)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white border border-rose-100 rounded-2xl shadow-sm">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl mb-4 border border-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m-3.343-5.657L3.929 17.2a2 2 0 001.414 3.414h13.314a2 2 0 001.414-3.414l-4.728-4.728A2 2 0 0012 12a2 2 0 00-3.343.343z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Access Restricted</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-2 leading-relaxed">
            Your current institutional role (<span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded text-[10px]">{props.user?.role || 'guest'}</span>) is insufficient to access this administrative area.
          </p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
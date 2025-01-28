'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types';

interface WithAuthProps {
  allowedRoles?: UserRole[];
}

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  { allowedRoles }: WithAuthProps = {}
) {
  return function WithAuthComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (!loading && user && allowedRoles) {
        const hasAllowedRole = allowedRoles.includes(user.role);
        if (!hasAllowedRole) {
          const redirectPath = user.role === 'freelancer' ? '/freelancer' : '/client';
          router.push(redirectPath);
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    // If roles are specified and user doesn't have permission, don't render the component
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
} 

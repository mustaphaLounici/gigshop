import type { UserRole } from '@/types';

export const getNavigationPaths = (role: UserRole) => {
  return {
    dashboard: `/dashboard/${role === 'job_poster' ? 'client' : role}`,
    gigs: '/gigs',
    profile: '/profile',
  };
};

export const getRoleBasedRedirect = (role: UserRole) => {
  return `/dashboard/${role === 'job_poster' ? 'client' : role}`;
}; 
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { getNavigationPaths } from '@/utils/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Successfully signed out');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

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

  const paths = getNavigationPaths(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link
              href={paths.dashboard}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary rounded-lg"
            >
              <HomeIcon className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link
              href={paths.gigs}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary rounded-lg"
            >
              <ClipboardDocumentListIcon className="w-5 h-5 mr-3" />
              {user.role === 'freelancer' ? 'Available Gigs' : 'My Gigs'}
            </Link>
            <Link
              href={paths.profile}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary rounded-lg"
            >
              <UserCircleIcon className="w-5 h-5 mr-3" />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary rounded-lg"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 
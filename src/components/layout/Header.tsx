'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    return user.role === 'freelancer' ? '/dashboard/freelancer' : '/dashboard/client';
  };

  const isActive = (path: string) => {
    return pathname === path ? 'text-primary' : 'text-gray-700 hover:text-primary';
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={getDashboardLink()} className="flex items-center">
            <span className="text-2xl font-bold text-primary">GigShop</span>
          </Link>

         

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary focus:outline-none"
              >
                <span className="font-medium">{user.name}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <div className="px-4 py-2 text-sm text-gray-500">
                    Signed in as<br />
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </div>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
             
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-left font-medium text-red-600 hover:text-red-800"
                >
                  Sign out
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 
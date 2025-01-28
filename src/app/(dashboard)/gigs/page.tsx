'use client';

import { useState } from 'react';
import { withAuth } from '@/components/auth/withAuth';
import CreateGigForm from '@/components/gigs/CreateGigForm';
import GigsList from '@/components/gigs/GigsList';
import FreelancerGigs from '@/components/gigs/FreelancerGigs';
import { useUser } from '@/hooks/useUser';
import { PlusIcon } from '@heroicons/react/24/outline';

function GigsPage() {
  const { user, loading } = useUser();
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please sign in to view gigs.</p>
      </div>
    );
  }

  // Freelancer view - show available gigs to apply
  if (user.role === 'freelancer') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Available Gigs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Browse and apply for gigs that match your skills
          </p>
        </div>
        <FreelancerGigs />
      </div>
    );
  }

  // Job poster view - show their posted gigs and ability to create new ones
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Gigs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage your gigs
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            {showCreateForm ? 'Cancel' : 'Post New Gig'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
          <CreateGigForm
            onSuccess={() => {
              setShowCreateForm(false);
              // This will cause the GigsList to re-fetch data
              window.location.reload();
            }}
          />
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <GigsList />
      </div>
    </div>
  );
}

export default withAuth(GigsPage); 
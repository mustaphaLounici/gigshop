'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import type { Gig } from '@/types';
import Link from 'next/link';

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'in-review': 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

export default function GigsList() {
  const { user } = useUser();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGigs = async () => {
      if (!user) return;

      try {
        // Fetch gigs posted by the current user
        const gigsRef = collection(db, 'gigs');
        const q = query(
          gigsRef,
          where('posterId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const gigsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Gig[];
        setGigs(gigsData);

        // Fetch application counts for each gig
        const counts: Record<string, number> = {};
        await Promise.all(
          gigsData.map(async (gig) => {
            const applicationsRef = collection(db, 'applications');
            const appQuery = query(applicationsRef, where('gigId', '==', gig.id));
            const appSnapshot = await getDocs(appQuery);
            counts[gig.id] = appSnapshot.size;
          })
        );
        setApplicationCounts(counts);
      } catch (error) {
        console.error('Error fetching gigs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No gigs found. Create your first gig to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Applications
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Budget
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deadline
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {gigs.map((gig) => (
            <tr key={gig.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{gig.title}</div>
                <div className="text-sm text-gray-500 truncate max-w-md">
                  {gig.description}
                  {gig.skills?.length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">
                      Skills: {gig.skills.join(', ')}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[gig.status]}`}>
                  {gig.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {applicationCounts[gig.id] || 0} applications
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  ${gig.budget}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(gig.deadline).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/gigs/${gig.id}`}
                  className="text-primary hover:text-primary-dark"
                >
                  View details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 
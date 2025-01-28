'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import type { Gig, GigApplication } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function FreelancerGigs() {
  const { user } = useUser();
  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [myApplications, setMyApplications] = useState<Record<string, GigApplication>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGigs = async () => {
      if (!user) return;

      try {
        // Fetch open gigs
        const gigsRef = collection(db, 'gigs');
        const q = query(
          gigsRef,
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const gigsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Gig[];
        setAvailableGigs(gigsData);

        // Fetch user's applications
        const applicationsRef = collection(db, 'applications');
        const appQuery = query(applicationsRef, where('freelancerId', '==', user.id));
        const appSnapshot = await getDocs(appQuery);
        const applications: Record<string, GigApplication> = {};
        appSnapshot.docs.forEach((doc) => {
          const data = doc.data() as GigApplication;
          applications[data.gigId] = { ...data, id: doc.id };
        });
        setMyApplications(applications);
      } catch (error) {
        console.error('Error fetching gigs:', error);
        toast.error('Failed to load gigs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, [user]);

  const handleApply = async (gigId: string) => {
    if (!user || applying || !coverLetter.trim()) return;

    try {
      setApplying(true);
      const application: Omit<GigApplication, 'id'> = {
        gigId,
        freelancerId: user.id,
        coverLetter: coverLetter.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const applicationsRef = collection(db, 'applications');
      const docRef = await addDoc(applicationsRef, application);
      
      setMyApplications((prev) => ({
        ...prev,
        [gigId]: { ...application, id: docRef.id } as GigApplication,
      }));
      
      setCoverLetter('');
      setSelectedGigId(null);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to gig:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (availableGigs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No available gigs found at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {availableGigs.map((gig) => (
        <div key={gig.id} className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{gig.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{gig.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">${gig.budget}</div>
              <div className="text-sm text-gray-500">
                Due {new Date(gig.deadline).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-700">
              <strong>Required Skills:</strong>{' '}
              {(gig.skills || []).join(', ') || 'No specific skills required'}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/gigs/${gig.id}`}
              className="text-sm text-primary hover:text-primary-dark"
            >
              View details
            </Link>

            {myApplications[gig.id] ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Applied
              </span>
            ) : (
              <button
                onClick={() => setSelectedGigId(selectedGigId === gig.id ? null : gig.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Apply Now
              </button>
            )}
          </div>

          {selectedGigId === gig.id && (
            <div className="mt-4">
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write your cover letter..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                rows={4}
              />
              <div className="mt-2 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedGigId(null);
                    setCoverLetter('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApply(gig.id)}
                  disabled={!coverLetter.trim() || applying}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? 'Applying...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 
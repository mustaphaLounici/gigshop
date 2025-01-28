'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import { withAuth } from '@/components/auth/withAuth';
import type { Gig, GigApplication, ApplicationStatus, User } from '@/types';
import toast from 'react-hot-toast';

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'in-review': 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800',
};

const applicationStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function GigDetailsPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [myApplication, setMyApplication] = useState<GigApplication | null>(null);
  const [applications, setApplications] = useState<(GigApplication & { id: string; freelancer?: User })[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!user || !id) return;

      try {
        // Fetch gig details
        const gigDoc = await getDoc(doc(db, 'gigs', id as string));
        if (!gigDoc.exists()) {
          toast.error('Gig not found');
          return;
        }

        const gigData = { id: gigDoc.id, ...gigDoc.data() } as Gig;
        setGig(gigData);

        // If user is a freelancer, fetch their application
        if (user.role === 'freelancer') {
          const applicationsRef = collection(db, 'applications');
          const appQuery = query(
            applicationsRef,
            where('gigId', '==', id),
            where('freelancerId', '==', user.id)
          );
          const appSnapshot = await getDocs(appQuery);
          if (!appSnapshot.empty) {
            const appData = appSnapshot.docs[0].data() as GigApplication;
            setMyApplication({ ...appData, id: appSnapshot.docs[0].id });
          }
        }

        // If user is job poster, fetch all applications with freelancer data
        if (user.role === 'job_poster') {
          const applicationsRef = collection(db, 'applications');
          const appQuery = query(applicationsRef, where('gigId', '==', id));
          const appSnapshot = await getDocs(appQuery);
          const applicationsData = appSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as (GigApplication & { id: string })[];

          // Fetch freelancer data for each application
          const freelancerPromises = applicationsData.map(async (app) => {
            const freelancerDoc = await getDoc(doc(db, 'users', app.freelancerId));
            if (freelancerDoc.exists()) {
              return {
                ...app,
                freelancer: { id: freelancerDoc.id, ...freelancerDoc.data() } as User
              };
            }
            return app;
          });

          const applicationsWithFreelancers = await Promise.all(freelancerPromises);
          setApplications(applicationsWithFreelancers);
          setApplicationCount(applicationsWithFreelancers.length);
        }
      } catch (error) {
        console.error('Error fetching gig details:', error);
        toast.error('Failed to load gig details');
      } finally {
        setLoading(false);
      }
    };

    fetchGigDetails();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !gig || applying || !coverLetter.trim()) return;

    try {
      setApplying(true);
      const application: Omit<GigApplication, 'id'> = {
        gigId: gig.id,
        freelancerId: user.id,
        coverLetter: coverLetter.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const applicationsRef = collection(db, 'applications');
      const docRef = await addDoc(applicationsRef, application);
      setMyApplication({ ...application, id: docRef.id });
      setCoverLetter('');
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to gig:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationStatus = async (applicationId: string, newStatus: ApplicationStatus) => {
    if (!gig || !user || user.role !== 'job_poster') return;

    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // If accepting the application
      if (newStatus === 'accepted') {
        // Update gig status and assignedTo
        const acceptedApp = applications.find(app => app.id === applicationId);
        await updateDoc(doc(db, 'gigs', gig.id), {
          status: 'assigned',
          assignedTo: acceptedApp?.freelancerId,
          updatedAt: new Date().toISOString()
        });
        setGig(prev => prev ? { 
          ...prev, 
          status: 'assigned',
          assignedTo: acceptedApp?.freelancerId 
        } : null);

        // Create notification for the accepted freelancer
        if (acceptedApp?.freelancerId) {
          await addDoc(collection(db, 'notifications'), {
            userId: acceptedApp.freelancerId,
            type: 'application_accepted',
            message: `Your application for "${gig.title}" has been accepted!`,
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        // Reject all other pending applications
        const otherPendingApps = applications.filter(
          app => app.status === 'pending' && app.id !== applicationId
        );

        await Promise.all(
          otherPendingApps.map(async (app) => {
            await updateDoc(doc(db, 'applications', app.id), {
              status: 'rejected',
              updatedAt: new Date().toISOString()
            });

            // Notify rejected freelancers
            await addDoc(collection(db, 'notifications'), {
              userId: app.freelancerId,
              type: 'application_rejected',
              message: `Your application for "${gig.title}" was not selected.`,
              read: false,
              createdAt: new Date().toISOString()
            });
          })
        );

        // Update local state for all applications
        setApplications(prev => prev.map(app => 
          app.id === applicationId
            ? { ...app, status: 'accepted' }
            : app.status === 'pending'
              ? { ...app, status: 'rejected' }
              : app
        ));

        toast.success('Application accepted and other applicants have been notified');
      } else if (newStatus === 'rejected') {
        // Create notification for the rejected freelancer
        const rejectedApp = applications.find(app => app.id === applicationId);
        if (rejectedApp?.freelancerId) {
          await addDoc(collection(db, 'notifications'), {
            userId: rejectedApp.freelancerId,
            type: 'application_rejected',
            message: `Your application for "${gig.title}" was not selected.`,
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId ? { ...app, status: newStatus } : app
        ));

        toast.success('Application rejected and applicant has been notified');
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    }
  };

  const updateGigStatus = async (newStatus: Gig['status']) => {
    if (!gig || !user || user.role !== 'job_poster') return;

    try {
      await updateDoc(doc(db, 'gigs', gig.id), {
        status: newStatus,
      });
      setGig({ ...gig, status: newStatus });
      toast.success('Gig status updated successfully!');
    } catch (error) {
      console.error('Error updating gig status:', error);
      toast.error('Failed to update gig status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Gig not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{gig.title}</h1>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[gig.status]}`}>
                {gig.status}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[gig.priority]}`}>
                {gig.priority}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>Posted {new Date(gig.createdAt).toLocaleDateString()}</div>
            <div className="font-medium text-primary">${gig.budget}</div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap mb-4">{gig.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(gig.skills || []).map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 text-xs font-medium bg-gray-100 rounded-full text-gray-800"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            Deadline: {new Date(gig.deadline).toLocaleDateString()}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          {!user ? null : user.role === 'freelancer' ? (
            // Freelancer View
            <div>
              {myApplication ? (
                <div className="text-center">
                  <span className="inline-flex items-center px-4 py-2 rounded-md bg-gray-100 text-gray-800">
                    Application submitted • {myApplication.status}
                  </span>
                </div>
              ) : gig.status === 'open' ? (
                <div className="space-y-4">
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Write your cover letter..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleApply}
                      disabled={applying || !coverLetter.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applying ? 'Applying...' : 'Submit Application'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  This gig is no longer accepting applications
                </div>
              )}
            </div>
          ) : (
            // Job Poster View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {applicationCount} application{applicationCount !== 1 ? 's' : ''}
                </div>
                <select
                  value={gig.status}
                  onChange={(e) => updateGigStatus(e.target.value as Gig['status'])}
                  className="ml-2 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Applications List for Job Poster */}
        {user?.role === 'job_poster' && applications.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Applications ({applicationCount})
                {gig.status === 'assigned' && (
                  <span className="ml-2 text-sm text-gray-500">
                    • Freelancer assigned
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {applications.map((application) => (
                  <div 
                    key={application.id} 
                    className={`bg-gray-50 rounded-lg p-4 ${
                      application.status === 'accepted' ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        {application.freelancer ? (
                          <div className="mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {application.freelancer.name}
                              </h3>
                              {application.freelancer.rating && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  ★ {application.freelancer.rating.toFixed(1)}
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${applicationStatusColors[application.status]}`}>
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                            </div>
                            {application.freelancer.skills && application.freelancer.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {application.freelancer.skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                            {application.freelancer.completedGigs !== undefined && (
                              <p className="text-sm text-gray-600 mt-1">
                                {application.freelancer.completedGigs} gigs completed
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 mb-2">Freelancer information not available</p>
                        )}
                        <div className="bg-white rounded p-3 mb-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.coverLetter}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Applied {new Date(application.createdAt).toLocaleDateString()}</span>
                          {application.updatedAt && application.status !== 'pending' && (
                            <span>
                              {application.status === 'accepted' ? 'Accepted' : 'Rejected'} on{' '}
                              {new Date(application.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        {application.status === 'pending' && gig.status !== 'assigned' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplicationStatus(application.id, 'accepted')}
                              className="px-3 py-1 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(GigDetailsPage); 
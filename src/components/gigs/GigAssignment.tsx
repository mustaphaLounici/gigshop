'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import type { User, Gig, GigApplication, Milestone } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  gig: Gig;
  onUpdate: () => void;
}

export default function GigAssignment({ gig, onUpdate }: Props) {
  const { user } = useUser();
  const [freelancers, setFreelancers] = useState<User[]>([]);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(gig.progress || 0);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch freelancers
        const freelancersRef = collection(db, 'users');
        const q = query(freelancersRef, where('role', '==', 'freelancer'));
        const querySnapshot = await getDocs(q);
        const freelancersData = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        setFreelancers(freelancersData);

        // Fetch applications
        const applicationsRef = collection(db, 'applications');
        const appQuery = query(applicationsRef, where('gigId', '==', gig.id));
        const appSnapshot = await getDocs(appQuery);
        const applicationsData = appSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GigApplication[];
        setApplications(applicationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [gig.id]);

  const handleAssign = async (freelancerId: string) => {
    try {
      await updateDoc(doc(db, 'gigs', gig.id), {
        assignedTo: freelancerId,
        status: 'assigned',
        updatedAt: new Date().toISOString(),
      });
      
      // Create notification for the freelancer
      await addDoc(collection(db, 'notifications'), {
        userId: freelancerId,
        title: 'New Gig Assignment',
        message: `You have been assigned to the gig: ${gig.title}`,
        type: 'assignment',
        read: false,
        createdAt: new Date().toISOString(),
        relatedGigId: gig.id,
      });

      toast.success('Freelancer assigned successfully');
      onUpdate();
    } catch (error) {
      console.error('Error assigning freelancer:', error);
      toast.error('Failed to assign freelancer');
    }
  };

  const handleProgressUpdate = async () => {
    try {
      await updateDoc(doc(db, 'gigs', gig.id), {
        progress,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Progress updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.dueDate) return;

    const milestone: Milestone = {
      id: Date.now().toString(),
      ...newMilestone,
      completed: false,
    };

    try {
      const updatedMilestones = [...gig.milestones, milestone];
      await updateDoc(doc(db, 'gigs', gig.id), {
        milestones: updatedMilestones,
        updatedAt: new Date().toISOString(),
      });

      setNewMilestone({ title: '', description: '', dueDate: '' });
      toast.success('Milestone added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding milestone:', error);
      toast.error('Failed to add milestone');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Section */}
      {!gig.assignedTo && user?.role === 'admin' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Assign Freelancer</h3>
          <div className="space-y-4">
            {freelancers.map((freelancer) => (
              <div key={freelancer.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{freelancer.name}</p>
                  <p className="text-sm text-gray-500">{freelancer.email}</p>
                  {freelancer.skills && (
                    <div className="flex gap-2 mt-1">
                      {freelancer.skills.map((skill) => (
                        <span key={skill} className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAssign(freelancer.uid)}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Tracking */}
      {gig.assignedTo && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Progress Tracking</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Progress</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm font-medium">{progress}%</span>
                <button
                  onClick={handleProgressUpdate}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h4 className="font-medium mb-2">Milestones</h4>
              <div className="space-y-4">
                {gig.milestones?.map((milestone) => (
                  <div key={milestone.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{milestone.title}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        milestone.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {milestone.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {/* Add Milestone Form */}
                <form onSubmit={handleAddMilestone} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Milestone title"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <textarea
                    placeholder="Description"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                  >
                    Add Milestone
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications Section */}
      {applications.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Applications</h3>
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {freelancers.find(f => f.uid === application.freelancerId)?.name}
                    </p>
                    <p className="text-sm text-gray-600">{application.proposal}</p>
                    <p className="text-sm font-medium text-primary">
                      Proposed: ${application.proposedPrice}
                    </p>
                  </div>
                  {application.status === 'pending' && user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(application.freelancerId)}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
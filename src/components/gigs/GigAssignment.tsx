'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc, 
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import type { User, Gig, GigApplication } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  gig: Gig;
  onUpdate: () => void;
}

// Separate components for better organization
const FreelancerCard = ({ freelancer, onAssign }: { freelancer: User; onAssign: (id: string) => void }) => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium">{freelancer.name}</h4>
        {freelancer.skills && (
          <p className="text-sm text-gray-500 mt-1">
            Skills: {freelancer.skills.join(', ')}
          </p>
        )}
        {freelancer.rating && (
          <p className="text-sm text-yellow-500 mt-1">
            Rating: {freelancer.rating.toFixed(1)} ★
          </p>
        )}
      </div>
      <button
        onClick={() => onAssign(freelancer.id)}
        className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
      >
        Assign
      </button>
    </div>
  </div>
);

const ApplicationCard = ({ 
  application, 
  isAssignable, 
  onAssign 
}: { 
  application: GigApplication & { freelancer?: User }; 
  isAssignable: boolean;
  onAssign: (id: string) => void;
}) => (
  <div className="p-3 border rounded">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{application.freelancer?.name}</p>
        <p className="text-sm text-gray-600">{application.coverLetter}</p>
      </div>
      {isAssignable && (
        <button
          onClick={() => onAssign(application.freelancerId)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Accept
        </button>
      )}
    </div>
  </div>
);

export default function GigAssignment({ gig, onUpdate }: Props) {
  const { user } = useUser();
  const [freelancers, setFreelancers] = useState<User[]>([]);
  const [applications, setApplications] = useState<(GigApplication & { freelancer?: User })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFreelancers = async () => {
    const freelancersRef = collection(db, 'users');
    const q = query(freelancersRef, where('role', '==', 'freelancer'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data } as User;
    });
  };

  

  useEffect(() => {
    const fetchApplications = async () => {
      const applicationsRef = collection(db, 'applications');
      const q = query(applicationsRef, where('gigId', '==', gig.id));
      const snapshot = await getDocs(q);
      
      const applications = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const appData = { id: docSnapshot.id, ...data } as GigApplication;
          const freelancerRef = doc(db, 'users', appData.freelancerId);
          const freelancerSnap = await getDoc(freelancerRef);
          const freelancerData = freelancerSnap.data();
          
          return {
            ...appData,
            freelancer: freelancerSnap.exists() && freelancerData
              ? { id: freelancerSnap.id, ...freelancerData } as User 
              : undefined
          };
        })
      );
      
      return applications;
    };
    const loadData = async () => {
      if (!user) return;

      try {
        const [freelancersData, applicationsData] = await Promise.all([
          fetchFreelancers(),
          fetchApplications()
        ]);

        setFreelancers(freelancersData);
        setApplications(applicationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gig.id, user]);

  const handleAssign = async (freelancerId: string) => {
    try {
      await updateDoc(doc(db, 'gigs', gig.id), {
        assignedTo: freelancerId,
        status: 'assigned',
        updatedAt: new Date().toISOString(),
      });
      
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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Section */}
      {!gig.assignedTo && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Assign Freelancer</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freelancers.map((freelancer) => (
              <FreelancerCard
                key={freelancer.id}
                freelancer={freelancer}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </div>
      )}

      {/* Applications Section */}
      {applications.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Applications</h3>
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                isAssignable={application.status === 'pending' && !gig.assignedTo}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
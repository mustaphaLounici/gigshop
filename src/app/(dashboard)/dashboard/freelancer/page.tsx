'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import { withAuth } from '@/components/auth/withAuth';
import type { Gig } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

function FreelancerDashboard() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    activeGigs: 0,
    completedGigs: 0,
    clientRating: 0,
  });
  const [recentGigs, setRecentGigs] = useState<Gig[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch all gigs assigned to the freelancer
        const gigsRef = collection(db, 'gigs');
        const gigsQuery = query(gigsRef, where('assignedTo', '==', user.id));
        const gigsSnapshot = await getDocs(gigsQuery);
        const gigs = gigsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gig));

        // Calculate metrics
        const activeGigs = gigs.filter(gig => ['assigned', 'in-progress'].includes(gig.status));
        const completed = gigs.filter(gig => gig.status === 'completed');
        const totalEarnings = completed.reduce((sum, gig) => sum + gig.budget, 0);

        // Calculate status distribution
        const distribution = [
          { name: 'Open', count: gigs.filter(gig => gig.status === 'open').length },
          { name: 'In Progress', count: gigs.filter(gig => gig.status === 'in-progress').length },
          { name: 'Completed', count: gigs.filter(gig => gig.status === 'completed').length },
        ];

        setMetrics({
          totalEarnings,
          activeGigs: activeGigs.length,
          completedGigs: completed.length,
          clientRating: user.rating || 0,
        });

        setStatusDistribution(distribution);
        setRecentGigs(gigs.slice(0, 5)); // Get 5 most recent gigs
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Freelancer Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Earnings</h3>
          <p className="text-3xl font-bold text-primary">${metrics.totalEarnings}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Gigs</h3>
          <p className="text-3xl font-bold text-primary">{metrics.activeGigs}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Gigs</h3>
          <p className="text-3xl font-bold text-primary">{metrics.completedGigs}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Client Rating</h3>
          <p className="text-3xl font-bold text-primary flex items-center">
            {metrics.clientRating.toFixed(1)}
            <span className="text-yellow-400 ml-1">★</span>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Earnings Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Earnings Overview</h2>
          <div className="h-[300px]">
            {/* Add line chart for earnings over time here */}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Gigs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Gigs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentGigs.map((gig) => (
            <div key={gig.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Link 
                    href={`/gigs/${gig.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-primary"
                  >
                    {gig.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Due {new Date(gig.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-medium text-primary">${gig.budget}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    gig.status === 'completed' ? 'bg-green-100 text-green-800' :
                    gig.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {gig.status.charAt(0).toUpperCase() + gig.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default withAuth(FreelancerDashboard); 
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import { withAuth } from '@/components/auth/withAuth';
import type { Gig } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Link from 'next/link';

function ClientDashboard() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState({
    totalSpent: 0,
    activeProjects: 0,
    openPositions: 0,
    completedProjects: 0,
  });
  const [recentGigs, setRecentGigs] = useState<Gig[]>([]);
  const [projectStatus, setProjectStatus] = useState<{ name: string; count: number }[]>([]);
  const [spendingOverview, setSpendingOverview] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch all gigs posted by the client
        const gigsRef = collection(db, 'gigs');
        const gigsQuery = query(gigsRef, where('posterId', '==', user.id));
        const gigsSnapshot = await getDocs(gigsQuery);
        const gigs = gigsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gig));

        // Calculate metrics
        const active = gigs.filter(gig => ['assigned', 'in-progress'].includes(gig.status));
        const open = gigs.filter(gig => gig.status === 'open');
        const completed = gigs.filter(gig => gig.status === 'completed');
        const totalSpent = completed.reduce((sum, gig) => sum + gig.budget, 0);

        // Calculate project status distribution
        const status = [
          { name: 'Open', count: open.length },
          { name: 'In Progress', count: active.length },
          { name: 'Completed', count: completed.length },
        ];

        // Generate spending overview data (last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const spending = months.map(month => ({
          month,
          amount: completed
            .filter(gig => new Date(gig.createdAt).toLocaleString('default', { month: 'short' }) === month)
            .reduce((sum, gig) => sum + gig.budget, 0),
        }));

        setMetrics({
          totalSpent,
          activeProjects: active.length,
          openPositions: open.length,
          completedProjects: completed.length,
        });

        setProjectStatus(status);
        setSpendingOverview(spending);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Client Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Spent</h3>
          <p className="text-3xl font-bold text-primary">${metrics.totalSpent}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Projects</h3>
          <p className="text-3xl font-bold text-primary">{metrics.activeProjects}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Open Positions</h3>
          <p className="text-3xl font-bold text-primary">{metrics.openPositions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Projects</h3>
          <p className="text-3xl font-bold text-primary">{metrics.completedProjects}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spending Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Spending Overview</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingOverview} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Amount']}
                  labelStyle={{ color: '#111827' }}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Project Status</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStatus} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Projects']}
                  labelStyle={{ color: '#111827' }}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Projects</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentGigs.map((gig) => (
            <div key={gig.id} className="p-6 hover:bg-gray-50">
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

export default withAuth(ClientDashboard); 
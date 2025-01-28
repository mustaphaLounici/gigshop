'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

interface GigMetrics {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<GigMetrics>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        const gigsRef = collection(db, 'gigs');
        const q = query(gigsRef, where('clientId', '==', user.id));
        const querySnapshot = await getDocs(q);

        const metrics: GigMetrics = {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
        };

        querySnapshot.forEach((doc) => {
          const gig = doc.data();
          metrics.total++;
          switch (gig.status) {
            case 'open':
              metrics.open++;
              break;
            case 'in-progress':
              metrics.inProgress++;
              break;
            case 'completed':
              metrics.completed++;
              break;
          }
        });

        setMetrics(metrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  const chartData = {
    labels: ['Open', 'In Progress', 'Completed'],
    datasets: [
      {
        data: [metrics.open, metrics.inProgress, metrics.completed],
        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981'],
        borderColor: ['#FFF', '#FFF', '#FFF'],
        borderWidth: 2,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl font-bold text-gray-900">{metrics.total}</div>
                <div className="mt-1 text-sm font-medium text-gray-500">Total Gigs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl font-bold text-accent">{metrics.open}</div>
                <div className="mt-1 text-sm font-medium text-gray-500">Open Gigs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl font-bold text-primary">{metrics.inProgress}</div>
                <div className="mt-1 text-sm font-medium text-gray-500">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl font-bold text-secondary">{metrics.completed}</div>
                <div className="mt-1 text-sm font-medium text-gray-500">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Gig Status Distribution</h2>
        <div className="h-64">
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
} 
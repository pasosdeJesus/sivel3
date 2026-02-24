
'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface UserEvent {
  id: number;
  timestamp: string;
  type: string;
  path?: string;
  amount?: number;
  currency?: string;
  metadata?: any;
}

export default function MetricsPage() {
  const [events, setEvents] = useState<UserEvent[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/userevent');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    }

    fetchEvents();
  }, []);

  const visits = events.filter((event) => event.type === 'visit');
  const donations = events.filter((event) => event.type === 'donation');

  const visitsByDate = visits.reduce((acc, visit) => {
    const date = new Date(visit.timestamp).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visitChartData = Object.entries(visitsByDate).map(([date, count]) => ({
    date,
    count,
  }));

  const donationsByCurrency = donations.reduce((acc, donation) => {
    if (donation.currency && donation.amount) {
      acc[donation.currency] = (acc[donation.currency] || 0) + donation.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const donationChartData = Object.entries(donationsByCurrency).map(([currency, total]) => ({
    currency,
    total,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Metrics</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Visits Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={visitChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Donations by Currency</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={donationChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="currency" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

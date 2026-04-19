import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Users, CreditCard, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface SubRecord {
  plan_type: string;
  billing_cycle: string;
  payment_mode: string;
  amount: number;
  status: string;
  created_at: string;
}

const CHART_COLORS = [
  'hsl(238, 52%, 33%)',
  'hsl(238, 52%, 50%)',
  'hsl(238, 52%, 67%)',
  'hsl(200, 60%, 50%)',
  'hsl(150, 50%, 45%)',
];

export function RevenueAnalytics() {
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'30d' | '90d' | '1y' | 'all'>('90d');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('store_subscriptions').select('*').order('created_at', { ascending: true });

    if (period !== 'all') {
      const now = new Date();
      const daysMap = { '30d': 30, '90d': 90, '1y': 365 };
      const from = new Date(now.getTime() - daysMap[period] * 86400000);
      query = query.gte('created_at', from.toISOString());
    }

    const [{ data: subData }, { data: storeData }] = await Promise.all([
      query,
      supabase.from('stores').select('id, plan_type, trial_ends_at, created_at'),
    ]);

    setSubs((subData as SubRecord[]) || []);
    setStores(storeData || []);
    setLoading(false);
  };

  // Stats
  const totalRevenue = subs.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + Number(s.amount), 0);
  const activeSubs = subs.filter(s => s.status === 'active').length;
  const recurringCount = subs.filter(s => s.status === 'active' && s.payment_mode === 'recurring').length;
  const avgRevenue = activeSubs > 0 ? totalRevenue / activeSubs : 0;

  // Plan distribution
  const planCounts: Record<string, number> = {};
  stores.forEach(s => { planCounts[s.plan_type] = (planCounts[s.plan_type] || 0) + 1; });
  const planData = Object.entries(planCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Monthly revenue chart
  const monthlyRevenue: Record<string, number> = {};
  subs.filter(s => s.status !== 'cancelled').forEach(s => {
    const month = new Date(s.created_at).toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(s.amount);
  });
  const revenueChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: +revenue.toFixed(2) }));

  // Billing cycle breakdown
  const cycleCounts: Record<string, number> = {};
  subs.filter(s => s.status === 'active').forEach(s => {
    const label = s.billing_cycle === '6months' ? '6 Months' : s.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly';
    cycleCounts[label] = (cycleCounts[label] || 0) + 1;
  });
  const cycleData = Object.entries(cycleCounts).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Revenue & Subscription Analytics</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Active Subs</span>
            </div>
            <p className="text-xl font-bold text-foreground">{activeSubs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Revenue</span>
            </div>
            <p className="text-xl font-bold text-foreground">${avgRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Recurring</span>
            </div>
            <p className="text-xl font-bold text-foreground">{recurringCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue (AUD)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(238, 52%, 33%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {planData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No stores yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Billing Cycle Breakdown (Active)</CardTitle>
          </CardHeader>
          <CardContent>
            {cycleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cycleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(238, 52%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No active subscriptions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

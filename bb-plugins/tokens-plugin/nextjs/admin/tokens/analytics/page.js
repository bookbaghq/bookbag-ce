'use client';

import { useState, useEffect } from 'react';
import apiConfig from '@/apiConfig.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, DollarSign, Zap, Clock, Users, Filter } from 'lucide-react';

export default function TokenAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [period, setPeriod] = useState('daily');
  const [userId, setUserId] = useState('');
  const [modelId, setModelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period, userId, modelId, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      console.log('=== FRONTEND fetchAnalytics called ===');
      console.log('State values BEFORE building URL:');
      console.log('  period:', period);
      console.log('  userId:', userId, '(empty?', userId === '', ')');
      console.log('  modelId:', modelId, '(empty?', modelId === '', ')');
      console.log('  startDate:', startDate, '(empty?', startDate === '', ')');
      console.log('  endDate:', endDate, '(empty?', endDate === '', ')');

      // Build query parameters
      const params = new URLSearchParams();
      params.append('period', period);
      console.log('  Added period to params:', period);

      if (userId) {
        params.append('userId', userId);
        console.log('  Added userId to params:', userId);
      } else {
        console.log('  SKIPPED userId (empty or falsy)');
      }

      if (modelId) {
        params.append('modelId', modelId);
        console.log('  Added modelId to params:', modelId);
      } else {
        console.log('  SKIPPED modelId (empty or falsy)');
      }

      if (startDate) {
        params.append('startDate', new Date(startDate).getTime().toString());
        console.log('  Added startDate to params:', startDate);
      } else {
        console.log('  SKIPPED startDate (empty or falsy)');
      }

      if (endDate) {
        params.append('endDate', new Date(endDate).getTime().toString());
        console.log('  Added endDate to params:', endDate);
      } else {
        console.log('  SKIPPED endDate (empty or falsy)');
      }

      const url = `${apiConfig.ApiConfig.main}/bb-tokens/api/tokens/analytics?${params.toString()}`;
      console.log('Final URL constructed:', url);
      console.log('Query string:', params.toString());

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setUserId('');
    setModelId('');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Token Analytics</h1>
          <p className="text-muted-foreground">
            Monitor and analyze LLM token usage across your application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Analytics</CardTitle>
            <CardDescription>
              Filter analytics by user, model, or date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="number"
                  placeholder="Enter user ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID</Label>
                <Input
                  id="modelId"
                  type="number"
                  placeholder="Enter model ID"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalRequests?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalTokens?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.totalPromptTokens?.toLocaleString() || 0} prompt | {analytics?.totalCompletionTokens?.toLocaleString() || 0} completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.totalCost?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tokens/Request</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics?.avgTokensPerRequest || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics?.avgDuration || 0)}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.avgTokensPerSecond?.toFixed(1) || '0'} tokens/sec
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(analytics?.byUser || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Usage by Model</CardTitle>
              <CardDescription>
                Breakdown of token consumption across different LLM models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics?.byModel || {}).map(([model, data]) => (
                  <div key={model} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{model}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.requests?.toLocaleString() || 0} requests
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold">
                        {data.tokens?.toLocaleString() || 0} tokens
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${data.cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
                {Object.keys(analytics?.byModel || {}).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No model data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Usage by User</CardTitle>
              <CardDescription>
                Per-user token consumption and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics?.byUser || {}).map(([userId, data]) => (
                  <div key={userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">User {userId}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.requests?.toLocaleString() || 0} requests
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold">
                        {data.tokens?.toLocaleString() || 0} tokens
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${data.cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
                {Object.keys(analytics?.byUser || {}).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No user data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Timeline</CardTitle>
              <CardDescription>
                Token usage trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.timeline || []).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.requests?.toLocaleString() || 0} requests
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold">
                        {entry.tokens?.toLocaleString() || 0} tokens
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${entry.cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
                {(analytics?.timeline || []).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No timeline data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

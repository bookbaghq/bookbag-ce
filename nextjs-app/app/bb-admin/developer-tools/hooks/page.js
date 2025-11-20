'use client';

/**
 * Hooks Inspector Page
 * Developer Tools > Hooks
 * WordPress-style hooks and filters visualization panel
 */

import { useState, useEffect } from 'react';
import {
  Code,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Zap,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

const CATEGORY_COLORS = {
  lifecycle: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  chat: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  client: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  user: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  database: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  api: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  scheduler: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  media: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  system: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const CATEGORY_ICONS = {
  lifecycle: Code,
  admin: Package,
  chat: Activity,
  client: Zap,
  user: CheckCircle2,
  database: AlertCircle,
  api: Code,
  scheduler: Activity,
  media: Package,
  system: Code
};

export default function HooksInspectorPage() {
  const [stats, setStats] = useState(null);
  const [hooksByCategory, setHooksByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['lifecycle']));
  const [expandedHooks, setExpandedHooks] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/plugins/hooks/stats`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setHooksByCategory(data.hooks);
      } else {
        toast.error(data.error || 'Failed to load hooks data');
      }
    } catch (error) {
      console.error('Failed to fetch hooks data:', error);
      toast.error('Failed to load hooks data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleHook = (hookConstant) => {
    const newExpanded = new Set(expandedHooks);
    if (newExpanded.has(hookConstant)) {
      newExpanded.delete(hookConstant);
    } else {
      newExpanded.add(hookConstant);
    }
    setExpandedHooks(newExpanded);
  };

  const getFilteredCategories = () => {
    if (!hooksByCategory) return [];

    return Object.entries(hooksByCategory).filter(([category, hooks]) => {
      // Filter by category
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const hasMatchingHook = hooks.some(hook =>
          hook.name.toLowerCase().includes(term) ||
          hook.constant.toLowerCase().includes(term)
        );
        if (!hasMatchingHook) return false;
      }

      // Filter by active status
      if (showActiveOnly && !hooks.some(h => h.hasCallbacks)) return false;

      return true;
    });
  };

  const getFilteredHooks = (hooks) => {
    let filtered = hooks;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(hook =>
        hook.name.toLowerCase().includes(term) ||
        hook.constant.toLowerCase().includes(term)
      );
    }

    // Filter by active status
    if (showActiveOnly) {
      filtered = filtered.filter(h => h.hasCallbacks);
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading hooks inspector...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredCategories = getFilteredCategories();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hooks Inspector</h1>
          <p className="text-muted-foreground mt-1">
            View all registered hooks and their callbacks across the plugin system
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Code className="h-4 w-4" />
            <span className="text-sm">Total Hooks</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalHooks || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Active Hooks</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats?.activeHooks || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Total Callbacks</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats?.totalCallbacks || 0}</p>
        </Card>
      </div>

      {/* Category Stats */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Hooks by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats?.byCategory && Object.entries(stats.byCategory).map(([category, categoryStats]) => {
            const Icon = CATEGORY_ICONS[category] || Code;
            return (
              <div key={category} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium capitalize">{category}</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{categoryStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active:</span>
                    <span className="font-medium text-green-600">{categoryStats.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Callbacks:</span>
                    <span className="font-medium text-blue-600">{categoryStats.callbacks}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search hooks by name or constant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showActiveOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showActiveOnly ? 'Active Only' : 'All Hooks'}
          </Button>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Categories</option>
            {Object.keys(hooksByCategory).map(category => (
              <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hooks by Category */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hooks match your filters</p>
            </div>
          </Card>
        ) : (
          filteredCategories.map(([category, hooks]) => {
            const Icon = CATEGORY_ICONS[category] || Code;
            const filteredHooks = getFilteredHooks(hooks);
            const isExpanded = expandedCategories.has(category);
            const categoryColor = CATEGORY_COLORS[category];

            return (
              <Card key={category} className="overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <h3 className="text-lg font-semibold capitalize">{category}</h3>
                    <Badge className={categoryColor}>
                      {filteredHooks.length} hooks
                    </Badge>
                    <Badge variant="outline">
                      {filteredHooks.filter(h => h.hasCallbacks).length} active
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t">
                    {filteredHooks.map((hook) => (
                      <div key={hook.constant} className="border-b last:border-b-0">
                        <button
                          onClick={() => toggleHook(hook.constant)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono font-semibold">{hook.name}</code>
                                {hook.hasCallbacks && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {hook.constant}
                              </div>
                            </div>
                            <Badge variant={hook.hasCallbacks ? 'default' : 'outline'}>
                              {hook.callbackCount} {hook.callbackCount === 1 ? 'callback' : 'callbacks'}
                            </Badge>
                          </div>
                          {expandedHooks.has(hook.constant) ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                        </button>

                        {expandedHooks.has(hook.constant) && hook.hasCallbacks && (
                          <div className="bg-muted/30 p-4 space-y-2">
                            <h4 className="text-sm font-semibold mb-2">Registered Callbacks:</h4>
                            {hook.callbacks.map((callback, idx) => (
                              <div key={idx} className="bg-background border rounded-lg p-3 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{callback.plugin}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Priority: {callback.priority}
                                  </Badge>
                                </div>
                                <code className="text-xs text-muted-foreground">
                                  {callback.functionName}
                                </code>
                              </div>
                            ))}
                          </div>
                        )}

                        {expandedHooks.has(hook.constant) && !hook.hasCallbacks && (
                          <div className="bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground text-center">
                              No callbacks registered for this hook
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Info Note */}
      <Card className="p-4 bg-muted/50">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Code className="h-4 w-4" />
          About Hooks Inspector
        </h3>
        <p className="text-sm text-muted-foreground">
          The Hooks Inspector displays all available hooks in the Bookbag plugin system. Hooks allow plugins to extend
          and modify core functionality. Active hooks have at least one callback registered. Click on any hook to view
          detailed information about registered callbacks, their priority, and which plugin registered them.
        </p>
      </Card>
    </div>
  );
}

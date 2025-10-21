'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, MessageSquare, Cpu, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function TokenAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/bb-chat/api/token-analytics`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        toast.error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Token Analytics</h1>
        <p className="text-muted-foreground">
          Overview of token usage across chats, models, and users
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.totalTokens)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all chats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalChats.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Messages sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tokens/Chat</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalChats > 0
                ? formatNumber(Math.round(analytics.totalTokens / analytics.totalChats))
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average per chat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Chats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top 10 Chats by Token Usage</CardTitle>
          <CardDescription>
            Chats consuming the most tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topChats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No chat data available
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topChats.map((chat, index) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {chat.id} • Session: {chat.session_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                    <p className="font-bold text-lg">{formatNumber(chat.total_tokens)}</p>
                    <p className="text-xs text-muted-foreground">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Models */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top 10 Models by Token Usage</CardTitle>
          <CardDescription>
            Models consuming the most tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topModels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No model data available
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topModels.map((model, index) => (
                <div
                  key={model.model_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{model.model_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Provider: {model.provider} • {model.message_count.toLocaleString()} messages • Avg: {formatNumber(model.avg_tokens_per_message)} tokens/msg
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                    <p className="font-bold text-lg">{formatNumber(model.total_tokens)}</p>
                    <p className="text-xs text-muted-foreground">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top 10 Users by Token Usage</CardTitle>
          <CardDescription>
            Users consuming the most tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No user data available
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topUsers.map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username} • {user.email} • {user.chat_count} chats • Avg: {formatNumber(user.avg_tokens_per_chat)} tokens/chat
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                    <p className="font-bold text-lg">{formatNumber(user.total_tokens)}</p>
                    <p className="text-xs text-muted-foreground">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Token Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">What are tokens?</h3>
            <p>
              Tokens are pieces of text that language models process. A token can be as short as one character
              or as long as one word. Token usage is the primary metric for measuring LLM API costs and usage.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">How is token usage calculated?</h3>
            <p>
              Token usage is tracked at the chat level (total_token_count) and aggregated across different
              dimensions: chats, models, and users. Each message tracks its token count, which contributes
              to the chat&apos;s total.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">What&apos;s included?</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Only non-deleted and non-archived chats are included</li>
              <li>Token counts include both input and output tokens</li>
              <li>Statistics are updated in real-time as new messages are created</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

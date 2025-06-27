import React from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Users, 
  Image, 
  Eye, 
  TrendingUp, 
  Clock,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data: analytics, isLoading } = useQuery(
    'dashboard-analytics',
    () => api.get('/analytics/dashboard').then(res => res.data),
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { overview, recentContent, popularContent } = analytics || {};

  const stats = [
    {
      title: 'Total Content',
      value: overview?.content?.total_content || 0,
      icon: FileText,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Total Views',
      value: overview?.content?.total_views || 0,
      icon: Eye,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Total Users',
      value: overview?.users?.total_users || 0,
      icon: Users,
      color: 'bg-purple-500',
      change: '+3%',
    },
    {
      title: 'Media Files',
      value: overview?.media?.total_media || 0,
      icon: Image,
      color: 'bg-orange-500',
      change: '+15%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your content.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Content
            </h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentContent?.map((content: any) => (
              <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {content.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {content.author_name} • {content.views} views
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    content.status === 'published' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {content.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Content */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Popular Content
            </h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {popularContent?.map((content: any) => (
              <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {content.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {content.author_name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Eye className="h-3 w-3 mr-1" />
                    {content.views.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Create Content</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Start writing a new post or page</p>
          </button>
          <button className="p-4 text-left bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
            <Image className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Upload Media</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Add images and files to your library</p>
          </button>
          <button className="p-4 text-left bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">View Analytics</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Check your content performance</p>
          </button>
        </div>
      </div>
    </div>
  );
};
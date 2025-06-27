import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  Settings,
  Eye,
  Grid,
  List,
  Image,
  Menu,
  Sliders,
  FileText,
  Table,
  FormInput
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const moduleTypeIcons = {
  banner: Image,
  slider: Sliders,
  menu: Menu,
  gallery: Grid,
  form: FormInput,
  text: FileText,
  table: Table,
  list: List
};

export const Modules: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const [newModule, setNewModule] = useState({
    name: '',
    type: 'banner',
    title: '',
    description: '',
    status: 'active',
    sort_order: 0,
    settings: {},
    data: {}
  });

  const { data, isLoading, refetch } = useQuery(
    ['modules', { search, type, status }],
    () => api.get('/modules', {
      params: { search, type, status, limit: 20 }
    }).then(res => res.data),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (moduleData: any) => api.post('/modules', moduleData),
    {
      onSuccess: () => {
        toast.success('Module created successfully!');
        setShowCreateModal(false);
        setNewModule({
          name: '',
          type: 'banner',
          title: '',
          description: '',
          status: 'active',
          sort_order: 0,
          settings: {},
          data: {}
        });
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create module');
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/modules/${id}`),
    {
      onSuccess: () => {
        toast.success('Module deleted successfully!');
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete module');
      }
    }
  );

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete module "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newModule);
  };

  const getModuleTypeColor = (type: string) => {
    const colors = {
      banner: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      slider: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      menu: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      gallery: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      form: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      text: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      table: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      list: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    return colors[type as keyof typeof colors] || colors.text;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { modules = [], pagination } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dynamic Modules
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage banners, sliders, menus, galleries, forms and more
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Module
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="banner">Banner</option>
              <option value="slider">Slider</option>
              <option value="menu">Menu</option>
              <option value="gallery">Gallery</option>
              <option value="form">Form</option>
              <option value="text">Text</option>
              <option value="table">Table</option>
              <option value="list">List</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      {modules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-gray-400 mb-4">
            <Settings className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No modules found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {search || type || status ? 'Try adjusting your filters' : 'Create your first module to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module: any) => {
            const IconComponent = moduleTypeIcons[module.type as keyof typeof moduleTypeIcons] || Settings;
            
            return (
              <div
                key={module.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <IconComponent className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {module.title || module.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${getModuleTypeColor(module.type)}`}>
                          {module.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        module.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {module.status}
                      </span>
                    </div>
                  </div>

                  {module.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {module.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>by {module.created_by_name}</span>
                    <span>Order: {module.sort_order}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(module.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedModule(module)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/modules/edit/${module.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit Module"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      {(user?.role === 'admin' || module.created_by === user?.id) && (
                        <button
                          onClick={() => handleDelete(module.id, module.name)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete Module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Module
            </h3>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newModule.name}
                  onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="module-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newModule.type}
                  onChange={(e) => setNewModule(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="banner">Banner</option>
                  <option value="slider">Slider</option>
                  <option value="menu">Menu</option>
                  <option value="gallery">Gallery</option>
                  <option value="form">Form</option>
                  <option value="text">Text</option>
                  <option value="table">Table</option>
                  <option value="list">List</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newModule.title}
                  onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Display title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Module description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    value={newModule.status}
                    onChange={(e) => setNewModule(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    value={newModule.sort_order}
                    onChange={(e) => setNewModule(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Details Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Module Details
              </h3>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedModule.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${getModuleTypeColor(selectedModule.type)}`}>
                    {selectedModule.type}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedModule.title || 'No title'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedModule.description || 'No description'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedModule.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {selectedModule.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort Order
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedModule.sort_order}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Settings
                </label>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedModule.settings, null, 2)}
                </pre>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data
                </label>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedModule.data, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <Link
                to={`/modules/edit/${selectedModule.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => setSelectedModule(null)}
              >
                Edit Module
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
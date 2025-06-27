import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  FormInput,
  Eye,
  Users,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const Forms: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  const [newForm, setNewForm] = useState({
    name: '',
    title: '',
    description: '',
    status: 'active',
    settings: {
      submit_message: 'Thank you for your submission!',
      email_notification: true,
      redirect_url: ''
    }
  });

  const { data, isLoading, refetch } = useQuery(
    ['forms', { search, status }],
    () => api.get('/forms', {
      params: { search, status, limit: 20 }
    }).then(res => res.data),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (formData: any) => api.post('/forms', formData),
    {
      onSuccess: () => {
        toast.success('Form created successfully!');
        setShowCreateModal(false);
        setNewForm({
          name: '',
          title: '',
          description: '',
          status: 'active',
          settings: {
            submit_message: 'Thank you for your submission!',
            email_notification: true,
            redirect_url: ''
          }
        });
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create form');
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/forms/${id}`),
    {
      onSuccess: () => {
        toast.success('Form deleted successfully!');
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete form');
      }
    }
  );

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete form "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newForm);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { forms = [], pagination } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Forms
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage dynamic forms with custom fields
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Form
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
                placeholder="Search forms..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
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

      {/* Forms List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {forms.length === 0 ? (
          <div className="p-8 text-center">
            <FormInput className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No forms found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {search || status ? 'Try adjusting your filters' : 'Create your first form to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {forms.map((form: any) => (
              <div key={form.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FormInput className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {form.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {form.name}
                      </p>
                      {form.description && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          form.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {form.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {form.created_by_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(form.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-1" />
                        {form.submission_count || 0}
                      </div>
                      <div className="text-xs text-gray-400">submissions</div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedForm(form)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/forms/edit/${form.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit Form"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/forms/${form.id}/submissions`}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="View Submissions"
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                      {(user?.role === 'admin' || form.created_by === user?.id) && (
                        <button
                          onClick={() => handleDelete(form.id, form.name)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete Form"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Form
            </h3>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newForm.name}
                  onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="contact-form"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newForm.title}
                  onChange={(e) => setNewForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contact Form"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newForm.description}
                  onChange={(e) => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Form description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Success Message
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newForm.settings.submit_message}
                  onChange={(e) => setNewForm(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, submit_message: e.target.value }
                  }))}
                  placeholder="Thank you for your submission!"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={newForm.status}
                  onChange={(e) => setNewForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {createMutation.isLoading ? 'Creating...' : 'Create Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Details Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Form Details
              </h3>
              <button
                onClick={() => setSelectedForm(null)}
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
                  <p className="text-sm text-gray-900 dark:text-white">{selectedForm.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedForm.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {selectedForm.status}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedForm.title}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedForm.description || 'No description'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Submissions
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedForm.submission_count || 0} total submissions</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Settings
                </label>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedForm.settings, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedForm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <Link
                to={`/forms/edit/${selectedForm.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => setSelectedForm(null)}
              >
                Edit Form
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
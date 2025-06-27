import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { Save, ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface ContentBlock {
  id?: number;
  block_type: string;
  block_data: any;
  sort_order: number;
}

export const ContentEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [content, setContent] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
    featured_image: '',
    meta_title: '',
    meta_description: '',
    tags: '',
    category: ''
  });

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [availableModules, setAvailableModules] = useState([]);

  // Fetch content if editing
  const { data: contentData, isLoading } = useQuery(
    ['content', id],
    () => api.get(`/content/${id}`).then(res => res.data),
    { enabled: isEditing }
  );

  // Fetch content blocks if editing
  const { data: blocksData } = useQuery(
    ['content-blocks', id],
    () => api.get(`/content-blocks/content/${id}`).then(res => res.data),
    { enabled: isEditing }
  );

  // Fetch available modules
  const { data: modulesData } = useQuery(
    'modules-all',
    () => api.get('/modules', { params: { status: 'active', limit: 100 } }).then(res => res.data)
  );

  useEffect(() => {
    if (contentData) {
      setContent(contentData);
    }
  }, [contentData]);

  useEffect(() => {
    if (blocksData) {
      setBlocks(blocksData);
    }
  }, [blocksData]);

  useEffect(() => {
    if (modulesData) {
      setAvailableModules(modulesData.modules || []);
    }
  }, [modulesData]);

  const saveMutation = useMutation(
    (data: any) => {
      if (isEditing) {
        return api.put(`/content/${id}`, data);
      } else {
        return api.post('/content', data);
      }
    },
    {
      onSuccess: (response) => {
        toast.success(isEditing ? 'Content updated!' : 'Content created!');
        if (!isEditing) {
          navigate(`/content/edit/${response.data.id}`);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save content');
      }
    }
  );

  const saveBlocksMutation = useMutation(
    (blocksData: ContentBlock[]) => {
      const promises = blocksData.map((block, index) => {
        const blockWithOrder = { ...block, sort_order: index };
        if (block.id) {
          return api.put(`/content-blocks/${block.id}`, blockWithOrder);
        } else {
          return api.post('/content-blocks', { ...blockWithOrder, content_id: id });
        }
      });
      return Promise.all(promises);
    },
    {
      onSuccess: () => {
        toast.success('Content blocks updated!');
      },
      onError: (error: any) => {
        toast.error('Failed to update content blocks');
      }
    }
  );

  const handleSave = () => {
    saveMutation.mutate(content);
  };

  const handleSaveBlocks = () => {
    if (isEditing) {
      saveBlocksMutation.mutate(blocks);
    }
  };

  const addBlock = (type: string, moduleId?: number) => {
    const newBlock: ContentBlock = {
      block_type: type,
      block_data: moduleId ? { module_id: moduleId } : {},
      sort_order: blocks.length
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, data: any) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[index] = { ...updatedBlocks[index], block_data: data };
    setBlocks(updatedBlocks);
  };

  const removeBlock = (index: number) => {
    const updatedBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(updatedBlocks);
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const updatedBlocks = [...blocks];
    const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
    updatedBlocks.splice(toIndex, 0, movedBlock);
    setBlocks(updatedBlocks);
  };

  const renderBlockEditor = (block: ContentBlock, index: number) => {
    switch (block.block_type) {
      case 'text':
        return (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Heading"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.heading || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, heading: e.target.value })}
            />
            <textarea
              rows={6}
              placeholder="Content"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.content || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, content: e.target.value })}
            />
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-4">
            <input
              type="url"
              placeholder="Image URL"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.url || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, url: e.target.value })}
            />
            <input
              type="text"
              placeholder="Alt text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.alt || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, alt: e.target.value })}
            />
            <input
              type="text"
              placeholder="Caption"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.caption || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, caption: e.target.value })}
            />
          </div>
        );

      case 'banner':
      case 'slider':
      case 'menu':
      case 'gallery':
      case 'form':
        const selectedModule = availableModules.find((m: any) => m.id === block.block_data.module_id);
        return (
          <div className="space-y-4">
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={block.block_data.module_id || ''}
              onChange={(e) => updateBlock(index, { ...block.block_data, module_id: parseInt(e.target.value) })}
            >
              <option value="">Select a {block.block_type}</option>
              {availableModules
                .filter((m: any) => m.type === block.block_type)
                .map((module: any) => (
                  <option key={module.id} value={module.id}>
                    {module.title || module.name}
                  </option>
                ))}
            </select>
            {selectedModule && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selected: {selectedModule.title || selectedModule.name}
                </p>
                {selectedModule.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedModule.description}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unknown block type: {block.block_type}
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/content')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Content' : 'Create Content'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isEditing ? 'Update your content' : 'Create new content with dynamic blocks'}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={saveMutation.isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isLoading ? 'Saving...' : 'Save Content'}
          </button>
          {isEditing && (
            <button
              onClick={handleSaveBlocks}
              disabled={saveBlocksMutation.isLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveBlocksMutation.isLoading ? 'Saving...' : 'Save Blocks'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.title}
                  onChange={(e) => setContent(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.slug}
                  onChange={(e) => setContent(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Excerpt
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.excerpt}
                  onChange={(e) => setContent(prev => ({ ...prev, excerpt: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.content}
                  onChange={(e) => setContent(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Content Blocks */}
          {isEditing && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Content Blocks
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => addBlock('text')}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    + Text
                  </button>
                  <button
                    onClick={() => addBlock('image')}
                    className="px-3 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    + Image
                  </button>
                  <div className="relative group">
                    <button className="px-3 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                      + Module
                    </button>
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {['banner', 'slider', 'menu', 'gallery', 'form'].map(type => (
                        <button
                          key={type}
                          onClick={() => addBlock(type)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg capitalize"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {block.block_type} Block
                        </span>
                      </div>
                      <button
                        onClick={() => removeBlock(index)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {renderBlockEditor(block, index)}
                  </div>
                ))}

                {blocks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No content blocks yet. Add some blocks to build your page.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.type}
                  onChange={(e) => setContent(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="post">Post</option>
                  <option value="page">Page</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.status}
                  onChange={(e) => setContent(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.category}
                  onChange={(e) => setContent(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Comma separated"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.tags}
                  onChange={(e) => setContent(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Featured Image
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.featured_image}
                  onChange={(e) => setContent(prev => ({ ...prev, featured_image: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              SEO
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.meta_title}
                  onChange={(e) => setContent(prev => ({ ...prev, meta_title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={content.meta_description}
                  onChange={(e) => setContent(prev => ({ ...prev, meta_description: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
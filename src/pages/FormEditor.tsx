import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Mail,
  Settings as SettingsIcon
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface FormField {
  id?: number;
  field_type: string;
  field_name: string;
  field_label: string;
  field_placeholder?: string;
  field_options?: string[];
  is_required: boolean;
  sort_order: number;
}

export const FormEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    title: '',
    description: '',
    status: 'active',
    settings: {
      submit_message: 'Thank you for your submission!',
      email_notification: true,
      notification_email: '',
      email_template_id: null,
      redirect_url: ''
    }
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [emailTemplates, setEmailTemplates] = useState([]);

  // Fetch form if editing
  const { data: formData, isLoading } = useQuery(
    ['form', id],
    () => api.get(`/forms/${id}`).then(res => res.data),
    { enabled: isEditing }
  );

  // Fetch email templates
  const { data: templatesData } = useQuery(
    'email-templates',
    () => api.get('/email/templates').then(res => res.data)
  );

  useEffect(() => {
    if (formData) {
      setForm(formData);
      setFields(formData.fields || []);
    }
  }, [formData]);

  useEffect(() => {
    if (templatesData) {
      setEmailTemplates(templatesData);
    }
  }, [templatesData]);

  const saveMutation = useMutation(
    (data: any) => {
      if (isEditing) {
        return api.put(`/forms/${id}`, data);
      } else {
        return api.post('/forms', data);
      }
    },
    {
      onSuccess: (response) => {
        toast.success(isEditing ? 'Form updated!' : 'Form created!');
        if (!isEditing) {
          navigate(`/forms/edit/${response.data.id}`);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save form');
      }
    }
  );

  const saveFieldsMutation = useMutation(
    (fieldsData: FormField[]) => api.put(`/forms/${id}/fields`, { fields: fieldsData }),
    {
      onSuccess: () => {
        toast.success('Form fields updated!');
      },
      onError: (error: any) => {
        toast.error('Failed to update form fields');
      }
    }
  );

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleSaveFields = () => {
    if (isEditing) {
      saveFieldsMutation.mutate(fields);
    }
  };

  const addField = (type: string) => {
    const newField: FormField = {
      field_type: type,
      field_name: `field_${fields.length + 1}`,
      field_label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      field_placeholder: '',
      field_options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [],
      is_required: false,
      sort_order: fields.length
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const updatedFields = [...fields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    setFields(updatedFields);
  };

  const renderFieldEditor = (field: FormField, index: number) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={field.field_name}
              onChange={(e) => updateField(index, { field_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Label
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={field.field_label}
              onChange={(e) => updateField(index, { field_label: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            value={field.field_placeholder || ''}
            onChange={(e) => updateField(index, { field_placeholder: e.target.value })}
          />
        </div>

        {(field.field_type === 'select' || field.field_type === 'radio') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Options (one per line)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={(field.field_options || []).join('\n')}
              onChange={(e) => updateField(index, { 
                field_options: e.target.value.split('\n').filter(opt => opt.trim()) 
              })}
            />
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id={`required-${index}`}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={field.is_required}
            onChange={(e) => updateField(index, { is_required: e.target.checked })}
          />
          <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Required field
          </label>
        </div>
      </div>
    );
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
            onClick={() => navigate('/forms')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Form' : 'Create Form'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isEditing ? 'Update your form configuration' : 'Create a new dynamic form'}
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
            {saveMutation.isLoading ? 'Saving...' : 'Save Form'}
          </button>
          {isEditing && (
            <button
              onClick={handleSaveFields}
              disabled={saveFieldsMutation.isLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveFieldsMutation.isLoading ? 'Saving...' : 'Save Fields'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Form Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          {isEditing && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Form Fields
                </h3>
                <div className="flex space-x-2">
                  {['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date'].map(type => (
                    <button
                      key={type}
                      onClick={() => addField(type)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors capitalize"
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {field.field_type} Field
                        </span>
                        {field.is_required && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeField(index)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {renderFieldEditor(field, index)}
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No form fields yet. Add some fields to build your form.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Form Settings */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Form Settings
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Success Message
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={form.settings.submit_message}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, submit_message: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Redirect URL (optional)
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={form.settings.redirect_url}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, redirect_url: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Email Notifications
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email-notification"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={form.settings.email_notification}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, email_notification: e.target.checked }
                  }))}
                />
                <label htmlFor="email-notification" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Send email notifications
                </label>
              </div>

              {form.settings.email_notification && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notification Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      value={form.settings.notification_email}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, notification_email: e.target.value }
                      }))}
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Template
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      value={form.settings.email_template_id || ''}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, email_template_id: e.target.value ? parseInt(e.target.value) : null }
                      }))}
                    >
                      <option value="">Select template</option>
                      {emailTemplates.map((template: any) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form Preview */}
          {isEditing && fields.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Form Preview
              </h3>
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  {form.title}
                </h4>
                {form.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {form.description}
                  </p>
                )}
                {fields.map((field, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.field_label}
                      {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.field_type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={field.field_placeholder}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        disabled
                      />
                    ) : field.field_type === 'select' ? (
                      <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" disabled>
                        <option>Select an option</option>
                        {field.field_options?.map((option, i) => (
                          <option key={i}>{option}</option>
                        ))}
                      </select>
                    ) : field.field_type === 'checkbox' ? (
                      <div className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600" disabled />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {field.field_placeholder || field.field_label}
                        </span>
                      </div>
                    ) : field.field_type === 'radio' ? (
                      <div className="space-y-2">
                        {field.field_options?.map((option, i) => (
                          <div key={i} className="flex items-center">
                            <input type="radio" name={`preview-${index}`} className="h-4 w-4 text-blue-600" disabled />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={field.field_type}
                        placeholder={field.field_placeholder}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        disabled
                      />
                    )}
                  </div>
                ))}
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm" disabled>
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
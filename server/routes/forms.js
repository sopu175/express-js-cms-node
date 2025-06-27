import express from 'express';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const formSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().optional(),
  settings: Joi.object().optional(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const formFieldSchema = Joi.object({
  field_type: Joi.string().valid('text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'file', 'date', 'number').required(),
  field_name: Joi.string().min(1).max(100).required(),
  field_label: Joi.string().max(255).required(),
  field_placeholder: Joi.string().max(255).optional(),
  field_options: Joi.array().items(Joi.string()).optional(),
  is_required: Joi.boolean().default(false),
  sort_order: Joi.number().integer().min(0).default(0)
});

const submissionSchema = Joi.object({
  form_id: Joi.number().integer().required(),
  submission_data: Joi.object().required()
});

// Get all forms
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('f.status = ?');
      params.push(status);
    }

    if (search) {
      whereConditions.push('(f.name LIKE ? OR f.title LIKE ? OR f.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM forms f
      ${whereClause}
    `;
    
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get forms
    const formsQuery = `
      SELECT 
        f.*,
        u.name as created_by_name,
        COUNT(fs.id) as submission_count
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN form_submissions fs ON f.id = fs.form_id
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const forms = await allQuery(formsQuery, [...params, parseInt(limit), offset]);

    // Parse JSON fields
    const parsedForms = forms.map(form => ({
      ...form,
      settings: form.settings ? JSON.parse(form.settings) : {}
    }));

    res.json({
      forms: parsedForms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get form by ID with fields
router.get('/:id', async (req, res, next) => {
  try {
    const form = await getQuery(`
      SELECT 
        f.*,
        u.name as created_by_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.id = ?
    `, [req.params.id]);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Get form fields
    const fields = await allQuery(`
      SELECT * FROM form_fields 
      WHERE form_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `, [req.params.id]);

    // Parse JSON fields
    const parsedFields = fields.map(field => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : []
    }));

    res.json({
      ...form,
      settings: form.settings ? JSON.parse(form.settings) : {},
      fields: parsedFields
    });
  } catch (error) {
    next(error);
  }
});

// Create form
router.post('/', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = formSchema.validate(req.body);
    if (error) throw error;

    const result = await runQuery(`
      INSERT INTO forms (name, title, description, settings, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      value.name,
      value.title,
      value.description || '',
      JSON.stringify(value.settings || {}),
      value.status,
      req.user.id
    ]);

    const newForm = await getQuery(`
      SELECT 
        f.*,
        u.name as created_by_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.id = ?
    `, [result.lastID]);

    res.status(201).json({
      ...newForm,
      settings: newForm.settings ? JSON.parse(newForm.settings) : {},
      fields: []
    });
  } catch (error) {
    next(error);
  }
});

// Update form
router.put('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const form = await getQuery('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const { error, value } = formSchema.validate(req.body);
    if (error) throw error;

    await runQuery(`
      UPDATE forms 
      SET name = ?, title = ?, description = ?, settings = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      value.name,
      value.title,
      value.description || '',
      JSON.stringify(value.settings || {}),
      value.status,
      req.params.id
    ]);

    const updatedForm = await getQuery(`
      SELECT 
        f.*,
        u.name as created_by_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.id = ?
    `, [req.params.id]);

    res.json({
      ...updatedForm,
      settings: updatedForm.settings ? JSON.parse(updatedForm.settings) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Delete form
router.delete('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const form = await getQuery('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await runQuery('DELETE FROM forms WHERE id = ?', [req.params.id]);

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add field to form
router.post('/:id/fields', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const form = await getQuery('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const { error, value } = formFieldSchema.validate(req.body);
    if (error) throw error;

    const result = await runQuery(`
      INSERT INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      value.field_type,
      value.field_name,
      value.field_label,
      value.field_placeholder || '',
      JSON.stringify(value.field_options || []),
      value.is_required ? 1 : 0,
      value.sort_order
    ]);

    const newField = await getQuery('SELECT * FROM form_fields WHERE id = ?', [result.lastID]);

    res.status(201).json({
      ...newField,
      field_options: newField.field_options ? JSON.parse(newField.field_options) : []
    });
  } catch (error) {
    next(error);
  }
});

// Update form field
router.put('/:id/fields/:fieldId', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const field = await getQuery('SELECT * FROM form_fields WHERE id = ? AND form_id = ?', [req.params.fieldId, req.params.id]);
    if (!field) {
      return res.status(404).json({ error: 'Form field not found' });
    }

    const { error, value } = formFieldSchema.validate(req.body);
    if (error) throw error;

    await runQuery(`
      UPDATE form_fields 
      SET field_type = ?, field_name = ?, field_label = ?, field_placeholder = ?, 
          field_options = ?, is_required = ?, sort_order = ?
      WHERE id = ?
    `, [
      value.field_type,
      value.field_name,
      value.field_label,
      value.field_placeholder || '',
      JSON.stringify(value.field_options || []),
      value.is_required ? 1 : 0,
      value.sort_order,
      req.params.fieldId
    ]);

    const updatedField = await getQuery('SELECT * FROM form_fields WHERE id = ?', [req.params.fieldId]);

    res.json({
      ...updatedField,
      field_options: updatedField.field_options ? JSON.parse(updatedField.field_options) : []
    });
  } catch (error) {
    next(error);
  }
});

// Delete form field
router.delete('/:id/fields/:fieldId', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const field = await getQuery('SELECT * FROM form_fields WHERE id = ? AND form_id = ?', [req.params.fieldId, req.params.id]);
    if (!field) {
      return res.status(404).json({ error: 'Form field not found' });
    }

    await runQuery('DELETE FROM form_fields WHERE id = ?', [req.params.fieldId]);

    res.json({ message: 'Form field deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Submit form (public endpoint)
router.post('/:id/submit', async (req, res, next) => {
  try {
    const form = await getQuery('SELECT * FROM forms WHERE id = ? AND status = "active"', [req.params.id]);
    if (!form) {
      return res.status(404).json({ error: 'Form not found or inactive' });
    }

    const { submission_data } = req.body;
    if (!submission_data || typeof submission_data !== 'object') {
      return res.status(400).json({ error: 'Invalid submission data' });
    }

    // Get form fields for validation
    const fields = await allQuery('SELECT * FROM form_fields WHERE form_id = ?', [req.params.id]);
    
    // Validate required fields
    for (const field of fields) {
      if (field.is_required && !submission_data[field.field_name]) {
        return res.status(400).json({ 
          error: `Field '${field.field_label}' is required` 
        });
      }
    }

    // Store submission
    await runQuery(`
      INSERT INTO form_submissions (form_id, submission_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `, [
      req.params.id,
      JSON.stringify(submission_data),
      req.ip,
      req.get('User-Agent')
    ]);

    const settings = form.settings ? JSON.parse(form.settings) : {};
    
    // Send email notification if configured
    if (settings.email_notification && settings.email_template_id) {
      try {
        const emailModule = await import('./email.js');
        
        // Prepare email variables
        const emailVariables = {
          ...submission_data,
          date: new Date().toLocaleString(),
          ip: req.ip,
          form_name: form.title
        };

        // Send notification email
        await fetch(`${req.protocol}://${req.get('host')}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || ''
          },
          body: JSON.stringify({
            to: settings.notification_email || 'admin@example.com',
            template_id: settings.email_template_id,
            variables: emailVariables
          })
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the form submission if email fails
      }
    }
    
    res.json({ 
      message: settings.submit_message || 'Form submitted successfully!',
      redirect_url: settings.redirect_url || null
    });
  } catch (error) {
    next(error);
  }
});

// Get form submissions
router.get('/:id/submissions', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await getQuery('SELECT COUNT(*) as total FROM form_submissions WHERE form_id = ?', [req.params.id]);
    const total = countResult.total;

    // Get submissions
    const submissions = await allQuery(`
      SELECT * FROM form_submissions 
      WHERE form_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [req.params.id, parseInt(limit), offset]);

    // Parse JSON fields
    const parsedSubmissions = submissions.map(submission => ({
      ...submission,
      submission_data: submission.submission_data ? JSON.parse(submission.submission_data) : {}
    }));

    res.json({
      submissions: parsedSubmissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update form fields
router.put('/:id/fields', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const form = await getQuery('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const { fields } = req.body;
    if (!Array.isArray(fields)) {
      return res.status(400).json({ error: 'Fields must be an array' });
    }

    // Delete existing fields
    await runQuery('DELETE FROM form_fields WHERE form_id = ?', [req.params.id]);

    // Insert new fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const { error, value } = formFieldSchema.validate({ ...field, sort_order: i });
      if (error) {
        throw new Error(`Field ${i + 1}: ${error.details[0].message}`);
      }

      await runQuery(`
        INSERT INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.params.id,
        value.field_type,
        value.field_name,
        value.field_label,
        value.field_placeholder || '',
        JSON.stringify(value.field_options || []),
        value.is_required ? 1 : 0,
        value.sort_order
      ]);
    }

    // Get updated fields
    const updatedFields = await allQuery(`
      SELECT * FROM form_fields 
      WHERE form_id = ? 
      ORDER BY sort_order ASC
    `, [req.params.id]);

    const parsedFields = updatedFields.map(field => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : []
    }));

    res.json({ 
      message: 'Form fields updated successfully',
      fields: parsedFields 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
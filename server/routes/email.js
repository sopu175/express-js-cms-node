import express from 'express';
import nodemailer from 'nodemailer';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Email configuration schema
const emailConfigSchema = Joi.object({
  smtp_host: Joi.string().required(),
  smtp_port: Joi.number().integer().min(1).max(65535).required(),
  smtp_secure: Joi.boolean().default(false),
  smtp_user: Joi.string().email().required(),
  smtp_password: Joi.string().required(),
  from_name: Joi.string().required(),
  from_email: Joi.string().email().required()
});

// Email template schema
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  subject: Joi.string().max(255).required(),
  html_content: Joi.string().required(),
  text_content: Joi.string().optional(),
  variables: Joi.array().items(Joi.string()).optional()
});

// Create email transporter
const createTransporter = (config) => {
  return nodemailer.createTransporter({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_password
    }
  });
};

// Get email configuration
router.get('/config', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const config = await getQuery('SELECT * FROM email_config WHERE id = 1');
    if (!config) {
      return res.json({
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: '',
        smtp_password: '',
        from_name: '',
        from_email: ''
      });
    }
    
    // Don't send password in response
    const { smtp_password, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    next(error);
  }
});

// Update email configuration
router.put('/config', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const { error, value } = emailConfigSchema.validate(req.body);
    if (error) throw error;

    // Test email configuration
    try {
      const transporter = createTransporter(value);
      await transporter.verify();
    } catch (emailError) {
      return res.status(400).json({ 
        error: 'Invalid email configuration',
        details: emailError.message 
      });
    }

    // Check if config exists
    const existingConfig = await getQuery('SELECT id FROM email_config WHERE id = 1');
    
    if (existingConfig) {
      await runQuery(`
        UPDATE email_config 
        SET smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, 
            smtp_password = ?, from_name = ?, from_email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        value.smtp_host, value.smtp_port, value.smtp_secure ? 1 : 0,
        value.smtp_user, value.smtp_password, value.from_name, value.from_email
      ]);
    } else {
      await runQuery(`
        INSERT INTO email_config (smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, from_name, from_email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        value.smtp_host, value.smtp_port, value.smtp_secure ? 1 : 0,
        value.smtp_user, value.smtp_password, value.from_name, value.from_email
      ]);
    }

    res.json({ message: 'Email configuration updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get email templates
router.get('/templates', authMiddleware, async (req, res, next) => {
  try {
    const templates = await allQuery('SELECT * FROM email_templates ORDER BY created_at DESC');
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Create email template
router.post('/templates', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) throw error;

    const result = await runQuery(`
      INSERT INTO email_templates (name, subject, html_content, text_content, variables, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      value.name,
      value.subject,
      value.html_content,
      value.text_content || '',
      JSON.stringify(value.variables || []),
      req.user.id
    ]);

    const newTemplate = await getQuery('SELECT * FROM email_templates WHERE id = ?', [result.lastID]);
    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
});

// Update email template
router.put('/templates/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const template = await getQuery('SELECT * FROM email_templates WHERE id = ?', [req.params.id]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { error, value } = templateSchema.validate(req.body);
    if (error) throw error;

    await runQuery(`
      UPDATE email_templates 
      SET name = ?, subject = ?, html_content = ?, text_content = ?, variables = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      value.name,
      value.subject,
      value.html_content,
      value.text_content || '',
      JSON.stringify(value.variables || []),
      req.params.id
    ]);

    const updatedTemplate = await getQuery('SELECT * FROM email_templates WHERE id = ?', [req.params.id]);
    res.json(updatedTemplate);
  } catch (error) {
    next(error);
  }
});

// Delete email template
router.delete('/templates/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const template = await getQuery('SELECT * FROM email_templates WHERE id = ?', [req.params.id]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await runQuery('DELETE FROM email_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Send email
router.post('/send', authMiddleware, async (req, res, next) => {
  try {
    const { to, template_id, variables = {}, subject_override, content_override } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Get email configuration
    const config = await getQuery('SELECT * FROM email_config WHERE id = 1');
    if (!config) {
      return res.status(400).json({ error: 'Email configuration not found' });
    }

    let subject, htmlContent, textContent;

    if (template_id) {
      // Use template
      const template = await getQuery('SELECT * FROM email_templates WHERE id = ?', [template_id]);
      if (!template) {
        return res.status(404).json({ error: 'Email template not found' });
      }

      subject = subject_override || template.subject;
      htmlContent = template.html_content;
      textContent = template.text_content;

      // Replace variables in content
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        if (textContent) {
          textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
        }
      });
    } else {
      // Use direct content
      subject = subject_override;
      htmlContent = content_override;
    }

    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }

    // Create transporter and send email
    const transporter = createTransporter(config);
    
    const mailOptions = {
      from: `${config.from_name} <${config.from_email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: htmlContent,
      text: textContent
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email
    await runQuery(`
      INSERT INTO email_logs (recipient, subject, template_id, status, message_id, sent_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      Array.isArray(to) ? to.join(', ') : to,
      subject,
      template_id || null,
      'sent',
      info.messageId,
      req.user.id
    ]);

    res.json({ 
      message: 'Email sent successfully',
      messageId: info.messageId 
    });
  } catch (error) {
    // Log failed email
    try {
      await runQuery(`
        INSERT INTO email_logs (recipient, subject, template_id, status, error_message, sent_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        req.body.to || '',
        req.body.subject_override || '',
        req.body.template_id || null,
        'failed',
        error.message,
        req.user.id
      ]);
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }

    next(error);
  }
});

// Get email logs
router.get('/logs', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (status) {
      whereClause = 'WHERE el.status = ?';
      params.push(status);
    }

    const logs = await allQuery(`
      SELECT 
        el.*,
        u.name as sent_by_name,
        et.name as template_name
      FROM email_logs el
      LEFT JOIN users u ON el.sent_by = u.id
      LEFT JOIN email_templates et ON el.template_id = et.id
      ${whereClause}
      ORDER BY el.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const countResult = await getQuery(`
      SELECT COUNT(*) as total FROM email_logs el ${whereClause}
    `, params);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { generateTokens, authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('admin', 'editor', 'viewer').default('editor')
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw error;

    const { email, password } = value;
    
    const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await runQuery(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt.toISOString()]
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    // Only admins can register new users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can register new users' });
    }

    const { error, value } = registerSchema.validate(req.body);
    if (error) throw error;

    const { email, password, name, role } = value;
    
    // Check if user already exists
    const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await runQuery(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role]
    );

    const newUser = await getQuery('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    // Check if refresh token exists in database
    const session = await getQuery(
      'SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > datetime("now")',
      [refreshToken]
    );
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    
    // Update refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await runQuery(
      'UPDATE sessions SET refresh_token = ?, expires_at = ? WHERE id = ?',
      [newRefreshToken, expiresAt.toISOString(), session.id]
    );

    // Get user info
    const user = await getQuery('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.userId]);

    res.json({
      user,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await runQuery('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
});

export default router;
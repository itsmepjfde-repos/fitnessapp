import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthenticatedRequest,
  requireAuth,
  signCoachToken,
} from './server/auth.ts';
import { MySqlPortalRepository } from './server/mysqlRepo.ts';
import { PreviewPortalRepository } from './server/previewRepo.ts';
import {
  ALLOWED_WORKOUT_KEYS,
  DATE_REGEX,
  PortalRepository,
  WorkoutKey,
  getTodayIsoDate,
} from './server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createRepository(): PortalRepository {
  const mysqlHost = process.env.MYSQL_HOST?.trim();
  if (mysqlHost) {
    return new MySqlPortalRepository();
  }
  return new PreviewPortalRepository();
}

function validateVercelConfiguration(): void {
  if (process.env.VERCEL !== '1') return;

  const missing = [
    !process.env.MYSQL_HOST?.trim() && 'MYSQL_HOST',
    !process.env.MYSQL_USER?.trim() && 'MYSQL_USER',
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) &&
      'JWT_SECRET (at least 16 characters)',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Vercel environment variables: ${missing.join(', ')}.`,
    );
  }
}

function isWorkoutSelection(
  value: unknown,
): value is Record<WorkoutKey, boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const selection = value as Partial<Record<WorkoutKey, unknown>>;
  return ALLOWED_WORKOUT_KEYS.every(
    (key) => typeof selection[key] === 'boolean',
  );
}

export async function createApp() {
  validateVercelConfiguration();

  const app = express();
  const repo = createRepository();

  app.use(express.json({ limit: '256kb' }));

  // --- Auth Endpoints ---
  app.get('/api/auth/status', async (_req, res) => {
    try {
      const status = await repo.getAuthStatus();
      res.json(status);
    } catch (err) {
      console.error('Auth status check failed:', err);
      res.status(500).json({ error: 'Unable to verify authentication status.' });
    }
  });

  app.post('/api/auth/setup', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const fullName =
        typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : undefined;
      const rememberMe = Boolean(req.body?.rememberMe);

      if (!email || !email.includes('@') || email.length > 190) {
        res.status(400).json({ error: 'Enter a valid coach email address.' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
        return;
      }

      const coach = await repo.setupFirstCoach({ email, password, fullName });
      const token = signCoachToken(coach, rememberMe);
      res.status(201).json({ token, coach });
    } catch (err) {
      if (err instanceof Error && err.message === 'SETUP_LOCKED') {
        res.status(403).json({
          error: 'Coach workstation is already initialized. Please sign in.',
        });
        return;
      }
      console.error('Coach setup failed:', err);
      res.status(500).json({ error: 'Unable to complete coach setup.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const rememberMe = Boolean(req.body?.rememberMe);

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const coach = await repo.authenticateCoach(email, password);
      if (!coach) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = signCoachToken(coach, rememberMe);
      res.json({ token, coach });
    } catch (err) {
      console.error('Login failed:', err);
      res.status(500).json({ error: 'Authentication service error.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ coach: req.coach });
  });

  // --- Member Directory & Date-Wise History Endpoints ---
  app.get('/api/members', requireAuth, async (_req, res) => {
    try {
      const members = await repo.listMembers();
      res.json({ members });
    } catch (err) {
      console.error('Failed to list members:', err);
      res.status(500).json({ error: 'Failed to load member directory.' });
    }
  });

  app.post('/api/members', requireAuth, async (req, res) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

      if (name.length < 2 || name.length > 120) {
        res.status(400).json({ error: 'Athlete name must be 2–120 characters.' });
        return;
      }
      if (phone.length < 7 || phone.length > 30) {
        res.status(400).json({ error: 'Valid contact phone number is required.' });
        return;
      }
      const member = await repo.createMember({
        name,
        phone,
      });
      res.status(201).json({ member });
    } catch (err) {
      console.error('Failed to create member:', err);
      res.status(500).json({ error: 'Failed to enroll new member.' });
    }
  });

  app.get('/api/members/:id/history', requireAuth, async (req, res) => {
    try {
      const memberId = String(req.params.id || '').trim();
      if (!memberId || memberId.length > 64) {
        res.status(400).json({ error: 'Invalid member ID.' });
        return;
      }
      const member = await repo.getMemberHistory(memberId);
      if (!member) {
        res.status(404).json({ error: 'Member not found.' });
        return;
      }
      res.json({ member });
    } catch (err) {
      console.error('Failed to fetch member history:', err);
      res.status(500).json({ error: 'Failed to load athlete history.' });
    }
  });

  app.post('/api/members/:id/progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = String(req.params.id || '').trim();
      const strengthIndex = Number(req.body?.strengthIndex);
      const sessions = Number(req.body?.sessions);

      if (
        !Number.isFinite(strengthIndex) ||
        strengthIndex < 1 ||
        strengthIndex > 100
      ) {
        res.status(400).json({ error: 'Strength index must be between 1 and 100.' });
        return;
      }
      if (!Number.isFinite(sessions) || sessions < 0 || sessions > 14) {
        res.status(400).json({ error: 'Sessions must be between 0 and 14.' });
        return;
      }

      const member = await repo.logMemberProgress(
        memberId,
        Math.round(strengthIndex),
        Math.round(sessions),
        req.coach?.id || '0',
      );
      if (!member) {
        res.status(404).json({ error: 'Member not found.' });
        return;
      }
      res.status(201).json({ member });
    } catch (err) {
      console.error('Failed to log member progress:', err);
      res.status(500).json({ error: 'Failed to record weekly progress.' });
    }
  });

  // --- Date-Wise Attendance & Workout Tag Endpoints ---
  app.get('/api/attendance', requireAuth, async (req, res) => {
    try {
      const rawDate =
        typeof req.query.date === 'string' && req.query.date.trim()
          ? req.query.date.trim()
          : getTodayIsoDate();

      if (!DATE_REGEX.test(rawDate)) {
        res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD.' });
        return;
      }

      const checkIns = await repo.getAttendanceByDate(rawDate);
      res.json({ sessionDate: rawDate, checkIns });
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      res.status(500).json({ error: 'Failed to load attendance sheet.' });
    }
  });

  app.post('/api/attendance/batch', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionDate =
        typeof req.body?.sessionDate === 'string' && req.body.sessionDate.trim()
          ? req.body.sessionDate.trim()
          : getTodayIsoDate();
      const rawMemberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
      const memberIds = rawMemberIds
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        .slice(0, 100);
      const checkInTime =
        typeof req.body?.checkInTime === 'string'
          ? req.body.checkInTime.trim()
          : '';

      if (!DATE_REGEX.test(sessionDate)) {
        res.status(400).json({ error: 'Session date must be YYYY-MM-DD.' });
        return;
      }
      if (memberIds.length === 0) {
        res.status(400).json({ error: 'Select at least one athlete to check in.' });
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime)) {
        res.status(400).json({ error: 'Check-in time must be in HH:mm IST format.' });
        return;
      }

      const result = await repo.batchCheckIn({
        sessionDate,
        memberIds,
        checkInTime,
        coachId: req.coach?.id || '0',
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Batch check-in failed:', err);
      res.status(500).json({ error: 'Failed to save batch attendance check-in.' });
    }
  });

  app.patch('/api/attendance/:id/workouts', requireAuth, async (req, res) => {
    try {
      const checkInId = String(req.params.id || '').trim();
      const workoutKey = req.body?.workoutKey as WorkoutKey | undefined;
      const allDone =
        typeof req.body?.allDone === 'boolean' ? req.body.allDone : undefined;
      const hasWorkouts = Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'workouts',
      );
      const workouts = isWorkoutSelection(req.body?.workouts)
        ? req.body.workouts
        : undefined;

      if (!checkInId) {
        res.status(400).json({ error: 'Invalid check-in ID.' });
        return;
      }
      if (hasWorkouts && !workouts) {
        res.status(400).json({ error: 'Provide a valid set of workout selections.' });
        return;
      }
      if (
        !workouts &&
        allDone === undefined &&
        (!workoutKey || !ALLOWED_WORKOUT_KEYS.includes(workoutKey))
      ) {
        res.status(400).json({
          error: 'Provide a valid workoutKey, allDone flag, or workout selections.',
        });
        return;
      }

      const updated = await repo.toggleCheckInWorkout({
        checkInId,
        workoutKey,
        allDone,
        workouts,
      });
      if (!updated) {
        res.status(404).json({ error: 'Check-in entry not found.' });
        return;
      }
      res.json({ checkIn: updated });
    } catch (err) {
      console.error('Failed to update workout tags:', err);
      res.status(500).json({ error: 'Failed to update workout completion tags.' });
    }
  });

  app.delete('/api/attendance/:id', requireAuth, async (req, res) => {
    try {
      const checkInId = String(req.params.id || '').trim();
      if (!checkInId) {
        res.status(400).json({ error: 'Invalid check-in ID.' });
        return;
      }
      const result = await repo.deleteCheckIn(checkInId);
      if (!result) {
        res.status(404).json({ error: 'Check-in entry not found.' });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('Failed to delete check-in:', err);
      res.status(500).json({ error: 'Failed to remove check-in entry.' });
    }
  });

  // --- Retention Outreach Endpoints ---
  app.get('/api/outreach/meta', requireAuth, async (_req, res) => {
    try {
      const meta = await repo.getOutreachMeta();
      res.json(meta);
    } catch (err) {
      console.error('Failed to load outreach settings:', err);
      res.status(500).json({ error: 'Failed to load outreach template.' });
    }
  });

  app.put('/api/outreach/template', requireAuth, async (req, res) => {
    try {
      const template =
        typeof req.body?.template === 'string' ? req.body.template.trim() : '';
      if (template.length < 5 || template.length > 1000) {
        res.status(400).json({ error: 'Template must be between 5 and 1000 characters.' });
        return;
      }
      const saved = await repo.updateOutreachTemplate(template);
      res.json({ template: saved });
    } catch (err) {
      console.error('Failed to save template:', err);
      res.status(500).json({ error: 'Failed to update outreach template.' });
    }
  });

  app.post('/api/outreach', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const rawIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
      const memberIds = rawIds
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        .slice(0, 200);
      const channel = req.body?.channel === 'SMS' ? 'SMS' : req.body?.channel === 'WhatsApp' ? 'WhatsApp' : null;

      if (memberIds.length === 0 || !channel) {
        res.status(400).json({ error: 'Provide memberIds and a valid channel (WhatsApp or SMS).' });
        return;
      }

      const result = await repo.sendOutreach({
        memberIds,
        channel,
        coachId: req.coach?.id || '0',
      });
      res.status(201).json(result);
    } catch (err) {
      console.error('Outreach dispatch failed:', err);
      res.status(500).json({ error: 'Failed to log outreach dispatch.' });
    }
  });

  // Preview-only reset endpoint (no-op when running against real MySQL)
  app.post('/api/demo/reset', requireAuth, async (_req, res) => {
    try {
      if (repo.resetDemoData) {
        await repo.resetDemoData();
        res.json({ ok: true });
        return;
      }
      res.status(403).json({
        error: 'Reset demo data is disabled when connected to a live MySQL database.',
      });
    } catch (err) {
      console.error('Demo reset failed:', err);
      res.status(500).json({ error: 'Unable to reset demo data.' });
    }
  });

  // Unknown API route handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // --- Vite Dev Middleware / Production Static Assets ---
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  return app;
}

if (process.env.VERCEL !== '1') {
  createApp()
    .then((app) => {
      const port = Number(process.env.PORT) || 3000;
      app.listen(port, '0.0.0.0', () => {
        console.log(
          `DANNY'STHENICS Coach Pro server running on http://0.0.0.0:${port}`,
        );
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

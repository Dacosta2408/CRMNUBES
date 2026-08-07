import { Request, Response } from "express";
import { authService, validatePasswordStrength, validatePinFormat } from "../services/authService.js";

export const authController = {
  // POST /api/auth/login
  async login(req: Request, res: Response) {
    const { identifier, username, email, credentialInput, password, pin } = req.body;
    const loginId = identifier || username || email;
    const secret = credentialInput || password || pin;

    if (!loginId || !secret) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const result = await authService.login(loginId, secret);
    
    if (!result.success) {
      return res.status(result.status || 401).json({ success: false, message: result.message });
    }

    // Set HttpOnly Cookie for session security
    if (result.token) {
      res.cookie("gbk_session", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 24h
      });
    }

    return res.json({
      success: true,
      user: result.user,
      token: result.token,
      mustChangePassword: result.mustChangePassword
    });
  },

  // GET /api/auth/me
  async getCurrentUser(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.gbk_session;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    const user = await authService.validateSession(token);
    if (!user) {
      return res.status(401).json({ success: false, message: "Session expired or invalid." });
    }

    return res.json({ success: true, user });
  },

  // POST /api/auth/logout
  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.gbk_session;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;

    if (token) {
      authService.logout(token);
    }

    res.clearCookie("gbk_session");
    return res.json({ success: true, message: "Logged out successfully." });
  },

  // POST /api/auth/forgot-password
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    return res.json(result);
  },

  // POST /api/auth/reset-password/validate
  async validateResetToken(req: Request, res: Response) {
    const { token } = req.body;
    const result = authService.validateResetToken(token);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  // POST /api/auth/reset-password
  async executeResetPassword(req: Request, res: Response) {
    const { token, newPassword, newPin } = req.body;
    const result = await authService.executeResetPassword(token, newPassword, newPin);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  // ADMIN: POST /api/auth/admin/reset-password
  async adminResetPassword(req: Request, res: Response) {
    const { targetUserId, temporaryPassword, forceChangeOnNextLogin, sendEmail, revokeExistingSessions, authorName } = req.body;
    const result = await authService.adminResetPassword(targetUserId, {
      temporaryPassword,
      forceChangeOnNextLogin,
      sendEmail,
      revokeExistingSessions,
      authorName
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  // ADMIN: POST /api/auth/admin/reset-pin
  async adminResetPin(req: Request, res: Response) {
    const { targetUserId, newPin, authorName } = req.body;
    const result = await authService.adminResetPin(targetUserId, newPin, authorName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  // ADMIN: POST /api/auth/admin/revoke-sessions
  async adminRevokeSessions(req: Request, res: Response) {
    const { targetUserId, authorName } = req.body;
    const result = await authService.adminRevokeSessions(targetUserId, authorName);
    return res.json(result);
  },

  // ADMIN: POST /api/auth/admin/unlock
  async adminUnlockUser(req: Request, res: Response) {
    const { targetUserId, authorName } = req.body;
    const result = await authService.adminUnlockUser(targetUserId, authorName);
    return res.json(result);
  }
};

import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { ResponseUtil } from "../utils/response.util";
import { RegisterDto, LoginDto } from "../types";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: RegisterDto = req.body;
      const result = await this.authService.register(data);
      ResponseUtil.created(res, result, "Registration successful");
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: LoginDto = req.body;
      const result = await this.authService.login(data);
      ResponseUtil.success(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        ResponseUtil.error(res, "Refresh token is required", 400);
        return;
      }

      const result = await this.authService.refreshAccessToken(refresh_token);
      ResponseUtil.success(res, result, "Token refreshed successfully");
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token, new_password } = req.body;
      const result = await this.authService.resetPassword(token, new_password);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        ResponseUtil.error(res, "Refresh token is required", 400);
        return;
      }

      const result = await this.authService.logout(refresh_token);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

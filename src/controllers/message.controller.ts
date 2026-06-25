import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { ResponseUtil } from '../utils/response.util';
import { AuthRequest, SendMessageDto, PaginationQuery } from '../types';

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senderId = req.user!.id;
      const { userId } = req.params;
      const { content }: SendMessageDto = req.body;
      
      const message = await this.messageService.sendMessage(senderId, userId, content);
      ResponseUtil.created(res, message, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  };

  getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;
      const query: PaginationQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const messages = await this.messageService.getChatHistory(userId, otherUserId, query);
      ResponseUtil.success(res, messages);
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      
      const message = await this.messageService.markMessageAsRead(messageId, userId);
      ResponseUtil.success(res, message, 'Message marked as read');
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;
      
      const result = await this.messageService.markAllAsRead(userId, otherUserId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getConversations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversations = await this.messageService.getConversations(userId);
      ResponseUtil.success(res, { conversations });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: fromUserId } = req.query;
      
      const count = await this.messageService.getUnreadCount(
        userId,
        fromUserId as string | undefined
      );
      ResponseUtil.success(res, { unread_count: count });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;
      
      const result = await this.messageService.deleteConversation(userId, otherUserId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
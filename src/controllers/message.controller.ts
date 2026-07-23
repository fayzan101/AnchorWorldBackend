import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { ResponseUtil } from '../utils/response.util';
import { AuthRequest, SendMessageDto, PaginationQuery } from '../types';
import { emitToUser } from '../services/socket-event.service';
import { getMessageMediaPath } from '../middleware/message-upload.middleware';
import { isUserViewingChatWith } from '../socket/socket.handler';
import { NotificationService } from '../services/notification.service';

export class MessageController {
  private messageService: MessageService;
  private notificationService: NotificationService;

  constructor() {
    this.messageService = new MessageService();
    this.notificationService = new NotificationService();
  }

  sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senderId = req.user!.id;
      const { userId } = req.params;
      const { content, reply_to_message_id }: SendMessageDto = req.body;
      
      const message = await this.messageService.sendMessage(
        senderId,
        userId,
        content,
        reply_to_message_id
      );
      ResponseUtil.created(res, message, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  };

  sendVoiceMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senderId = req.user!.id;
      const { userId } = req.params;
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Voice file is required' });
        return;
      }

      const durationRaw = req.body?.duration_ms ?? req.body?.durationMs;
      const durationMs =
        durationRaw != null && `${durationRaw}`.trim() !== ''
          ? parseInt(`${durationRaw}`, 10)
          : null;
      const replyTo =
        (req.body?.reply_to_message_id as string | undefined) ||
        (req.body?.replyToMessageId as string | undefined) ||
        null;

      const mediaUrl = getMessageMediaPath(file.filename);

      const message = await this.messageService.sendVoiceMessage(
        senderId,
        userId,
        mediaUrl,
        Number.isFinite(durationMs as number) ? durationMs : null,
        replyTo
      );

      if (message.receiver_id) {
        emitToUser(message.receiver_id, 'new_message', message);
        if (!isUserViewingChatWith(message.receiver_id, senderId)) {
          this.notificationService
            .notifyNewMessage(
              message.receiver_id,
              message.sender?.full_name || 'Someone',
              'Voice message',
              senderId
            )
            .catch(console.error);
        }
      }

      ResponseUtil.created(res, message, 'Voice message sent');
    } catch (error) {
      next(error);
    }
  };

  editMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      const content = (req.body?.content as string) ?? '';

      const message = await this.messageService.editMessage(userId, messageId, content);

      const payload = {
        message_id: message.id,
        content: message.content,
        edited_at: message.edited_at,
      };
      emitToUser(message.sender_id, 'message_edited', payload);
      emitToUser(message.receiver_id, 'message_edited', payload);

      ResponseUtil.success(res, message, 'Message updated');
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

  getChatAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;
      const access = await this.messageService.getChatAccess(userId, otherUserId);
      ResponseUtil.success(res, access);
    } catch (error) {
      next(error);
    }
  };

  unlockChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;
      const result = await this.messageService.unlockChat(userId, otherUserId);
      ResponseUtil.success(res, result, 'Chat unlocked');
    } catch (error) {
      next(error);
    }
  };

  deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;
      const scopeRaw = (req.query.scope as string)?.toLowerCase() || 'me';
      const scope = scopeRaw === 'everyone' ? 'everyone' : 'me';

      const result = await this.messageService.deleteMessage(userId, messageId, scope);

      if (result.scope === 'everyone' && result.sender_id && result.receiver_id) {
        const payload = {
          message_id: result.id,
          scope: 'everyone',
          deleted_at: result.deleted_at,
        };
        emitToUser(result.sender_id, 'message_deleted', payload);
        emitToUser(result.receiver_id, 'message_deleted', payload);
      }

      ResponseUtil.success(res, result, scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you');
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
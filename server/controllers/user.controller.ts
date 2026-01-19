import { Request, Response } from 'express';
import { updateUser, getUserById } from '../models/user.model';
import { ErrorCodes } from '../../shared/errorCodes';

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nickname, avatar_url } = req.body;

    // 验证参数
    if (nickname && (nickname.length < 2 || nickname.length > 20)) {
      return res.status(400).json({
        code: ErrorCodes.INVALID_PARAMS,
        message: '昵称长度必须在2-20个字符之间',
        data: null
      });
    }

    if (avatar_url && !avatar_url.startsWith('http')) {
      return res.status(400).json({
        code: ErrorCodes.INVALID_PARAMS,
        message: '头像URL格式不正确',
        data: null
      });
    }

    // 构建更新数据
    const updateData: any = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar_url) updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        code: ErrorCodes.INVALID_PARAMS,
        message: '请提供要更新的字段',
        data: null
      });
    }

    // 更新用户资料
    await updateUser(userId, updateData);

    // 获取更新后的用户信息
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        code: ErrorCodes.USER_NOT_FOUND,
        message: '用户不存在',
        data: null
      });
    }

    res.json({
      code: 0,
      message: '资料更新成功',
      data: {
        user_id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        is_guide: user.is_guide,
        balance: user.balance,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: '更新资料失败',
      data: null
    });
  }
};

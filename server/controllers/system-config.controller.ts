import { Request, Response } from 'express';
import { SystemConfigService } from '../services/system-config.service.js';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { ValidationError } from '../utils/errors.js';

export const getPublicConfigs = async (req: Request, res: Response) => {
  try {
    // isPublic = true, enforce whitelist, ignore req.query.keys
    const data = await SystemConfigService.getConfigs(undefined, true); 

    res.json({
      code: 0,
      data
    });
  } catch (error: any) {
    console.error('Get configs error:', error);
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: '获取配置失败',
      data: null
    });
  }
};

export const updateConfigs = async (req: Request, res: Response) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      throw new ValidationError('参数格式错误: configs 必须为数组');
    }

    // Validate structure
    for (const cfg of configs) {
      if (!cfg.key || typeof cfg.value === 'undefined') {
        throw new ValidationError('参数格式错误: 缺少 key 或 value');
      }
    }

    await SystemConfigService.updateConfigs(configs);

    res.json({
      code: 0,
      message: '配置更新成功'
    });

  } catch (error: any) {
    console.error('Update configs error:', error);
    if (error instanceof ValidationError) {
        throw error;
    }
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: '更新配置失败',
      data: null
    });
  }
};

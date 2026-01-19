import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: ErrorCodes.INVALID_PARAMS,
        message: '请选择要上传的文件',
        data: null
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mime_type: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: '文件上传失败',
      data: null
    });
  }
};

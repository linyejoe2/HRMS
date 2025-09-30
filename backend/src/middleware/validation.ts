import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    next();
  };
};

// 登入驗證
export const loginSchema = Joi.object({
  empID: Joi.string().required().messages({
    'string.empty': '員工編號為必填項目',
    'any.required': '員工編號為必填項目'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': '密碼為必填項目',
    'string.min': '密碼至少需要 6 個字元',
    'any.required': '密碼為必填項目'
  })
});

// 註冊驗證
export const registerSchema = Joi.object({
  empID: Joi.string().required().messages({
    'string.empty': '員工編號為必填項目',
    'any.required': '員工編號為必填項目'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': '密碼為必填項目',
    'string.min': '密碼至少需要 6 個字元',
    'any.required': '密碼為必填項目'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': '兩次輸入的密碼不一致',
    'any.required': '請再次確認密碼'
  })
});

// 更新個人資料驗證
export const updateProfileSchema = Joi.object({
  department: Joi.string().optional()
}).min(1);

// 請假申請驗證
export const leaveRequestSchema = Joi.object({
  leaveType: Joi.string().required().messages({
    'string.empty': '請假類型為必填項目',
    'any.required': '請假類型為必填項目'
  }),
  reason: Joi.string().required().messages({
    'string.empty': '請假原因為必填項目',
    'any.required': '請假原因為必填項目'
  }),
  leaveStart: Joi.string().isoDate().required().messages({
    'string.empty': '開始日期為必填項目',
    'string.isoDate': '開始日期必須是有效的 ISO 日期格式',
    'any.required': '開始日期為必填項目'
  }),
  leaveEnd: Joi.string().isoDate().required().messages({
    'string.empty': '結束日期為必填項目',
    'string.isoDate': '結束日期必須是有效的 ISO 日期格式',
    'any.required': '結束日期為必填項目'
  })
});

export const validateLeaveRequest = validateRequest(leaveRequestSchema);

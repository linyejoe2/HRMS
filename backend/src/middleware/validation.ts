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

// Common validation schemas
export const loginSchema = Joi.object({
  empID: Joi.string().required().messages({
    'string.empty': 'Employee ID is required',
    'any.required': 'Employee ID is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

export const registerSchema = Joi.object({
  empID: Joi.string().required().messages({
    'string.empty': 'Employee ID is required',
    'any.required': 'Employee ID is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required'
  })
});

export const updateProfileSchema = Joi.object({
  department: Joi.string().optional()
}).min(1);

export const leaveRequestSchema = Joi.object({
  leaveType: Joi.string().required().messages({
    'string.empty': 'Leave type is required',
    'any.required': 'Leave type is required'
  }),
  reason: Joi.string().required().messages({
    'string.empty': 'Reason is required',
    'any.required': 'Reason is required'
  }),
  leaveStart: Joi.string().isoDate().required().messages({
    'string.empty': 'Leave start date is required',
    'string.isoDate': 'Leave start date must be a valid ISO date',
    'any.required': 'Leave start date is required'
  }),
  leaveEnd: Joi.string().isoDate().required().messages({
    'string.empty': 'Leave end date is required',
    'string.isoDate': 'Leave end date must be a valid ISO date',
    'any.required': 'Leave end date is required'
  })
});

export const validateLeaveRequest = validateRequest(leaveRequestSchema);
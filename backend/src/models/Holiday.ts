import mongoose, { Document, Schema } from 'mongoose';

// Holiday type enum
export type HolidayType = '國定假日' | '例假日' | '特殊假日';

// Interface for Holiday document
export interface IHoliday extends Document {
  date: Date;
  type: HolidayType;
  name: string;
  pay_rate: number;
  is_paid: boolean;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Holiday schema definition
const holidaySchema = new Schema<IHoliday>({
  date: {
    type: Date,
    required: [true, '日期為必填'],
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: [true, '假日類型為必填'],
    enum: {
      values: ['國定假日', '例假日', '特殊假日'],
      message: '{VALUE} 不是有效的假日類型'
    }
  },
  name: {
    type: String,
    required: [true, '假日名稱為必填'],
    trim: true
  },
  pay_rate: {
    type: Number,
    required: [true, '支薪倍率為必填'],
    default: 1.0,
    min: [0, '支薪倍率不可為負數']
  },
  is_paid: {
    type: Boolean,
    required: [true, '是否支薪為必填'],
    default: true
  },
  memo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for performance
holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });
holidaySchema.index({ is_paid: 1 });

// Export the model
export const Holiday = mongoose.model<IHoliday>('Holiday', holidaySchema);

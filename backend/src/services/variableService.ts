import { Variable, IVariable } from '../models';
import { APIError } from '../middleware';

export class VariableService {
  /**
   * Get all variables, optionally filtered by section
   */
  async getAllVariables(section?: string, includeInactive: boolean = false): Promise<IVariable[]> {
    const filter: any = {};

    if (section) {
      filter.section = section;
    }

    if (!includeInactive) {
      filter.isActive = true;
    }

    return Variable.find(filter).sort({ section: 1, code: 1 });
  }

  /**
   * Get variables by section
   */
  async getBySection(section: string, includeInactive: boolean = false): Promise<IVariable[]> {
    const filter: any = { section };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return Variable.find(filter).sort({ code: 1 });
  }

  /**
   * Get a single variable by section and code
   */
  async getByCode(section: string, code: string): Promise<IVariable | null> {
    return Variable.findOne({ section, code });
  }

  /**
   * Get variable by ID
   */
  async getById(id: string): Promise<IVariable | null> {
    return Variable.findById(id);
  }

  /**
   * Create a new variable
   */
  async createVariable(data: Partial<IVariable>): Promise<IVariable> {
    // Check if variable with same section and code already exists
    const existing = await Variable.findOne({
      section: data.section,
      code: data.code
    });

    if (existing) {
      throw new APIError(`變數已存在: ${data.section} - ${data.code}`, 400);
    }

    const variable = new Variable(data);
    return variable.save();
  }

  /**
   * Update a variable
   */
  async updateVariable(id: string, data: Partial<IVariable>): Promise<IVariable | null> {
    const variable = await Variable.findById(id);

    if (!variable) {
      throw new APIError('找不到變數', 404);
    }

    // If updating section or code, check for duplicates
    if (data.section || data.code) {
      const checkSection = data.section || variable.section;
      const checkCode = data.code || variable.code;

      const existing = await Variable.findOne({
        _id: { $ne: id },
        section: checkSection,
        code: checkCode
      });

      if (existing) {
        throw new APIError(`變數已存在: ${checkSection} - ${checkCode}`, 400);
      }
    }

    return Variable.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete a variable (soft delete by setting isActive to false)
   */
  async deleteVariable(id: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      const result = await Variable.findByIdAndDelete(id);
      return !!result;
    } else {
      const result = await Variable.findByIdAndUpdate(id, { isActive: false }, { new: true });
      return !!result;
    }
  }

  /**
   * Get all unique sections
   */
  async getSections(): Promise<string[]> {
    const sections = await Variable.distinct('section');
    return sections.sort();
  }

  /**
   * Bulk create variables
   */
  async bulkCreateVariables(variables: Partial<IVariable>[]): Promise<any[]> {
    // Check for duplicates within the batch
    const seen = new Set<string>();
    for (const v of variables) {
      const key = `${v.section}-${v.code}`;
      if (seen.has(key)) {
        throw new APIError(`批次中有重複的變數: ${v.section} - ${v.code}`, 400);
      }
      seen.add(key);
    }

    // Check for existing variables
    const checks = variables.map(v => ({ section: v.section, code: v.code }));
    const existing = await Variable.find({ $or: checks });

    if (existing.length > 0) {
      const duplicates = existing.map(e => `${e.section} - ${e.code}`).join(', ');
      throw new APIError(`以下變數已存在: ${duplicates}`, 400);
    }

    return Variable.insertMany(variables);
  }
}

export const variableService = new VariableService();

import { variableAPI } from '@/services/api';
import { Variable } from '@/types';

// Fetch departments
export let departmentCache: Variable[] = [];

export const getDepartments = async () => {
  // 如果已經有快取了，直接回傳，完全不走 await API
  if (departmentCache.length > 0) {
    return departmentCache;
  }

  try {
    const response = await variableAPI.getAll(undefined, false);
    const allVariables = response.data.data.variables;
    
    // 寫入快取
    departmentCache = allVariables.filter((v: Variable) => v.section === 'department');
    return departmentCache;
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
};

// Lookup department description by code
export const getDepartmentDescription = (departmentCode?: string): string => {
  if (!departmentCode) return '-';
  // const departmentObj = await getDepartments();
  if (!departmentCache) return "-"
  const department = departmentCache.find(dept => dept.code === departmentCode);
  return department?.description || departmentCode;
};
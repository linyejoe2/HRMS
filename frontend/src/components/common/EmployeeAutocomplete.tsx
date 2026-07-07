import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { Employee } from '../../types';
import { employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';

interface EmployeeAutocompleteProps {
  value: Employee | null;
  onChange: (employee: Employee | null) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const EmployeeAutocomplete: React.FC<EmployeeAutocompleteProps> = ({
  value,
  onChange,
  label = '員工',
  required = false,
  error = false,
  helperText
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await employeeAPI.getAll(1, 1000);
        setEmployees(response.data.data.employees || []);
      } catch (err) {
        console.error('Error fetching employees:', err);
        toast.error('無法載入員工列表');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <Autocomplete
      options={employees}
      getOptionLabel={(option) => `${option.name} (${option.empID})`}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      loading={loading}
      isOptionEqualToValue={(option, val) => option.empID === val.empID}
      filterOptions={(options, params) => {
        const searchStr = params.inputValue.toLowerCase();
        return options.filter((option) =>
          option.name.toLowerCase().includes(searchStr) ||
          option.empID.toLowerCase().includes(searchStr) ||
          (option.department && option.department.toLowerCase().includes(searchStr))
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          fullWidth
        />
      )}
    />
  );
};

export default EmployeeAutocomplete;

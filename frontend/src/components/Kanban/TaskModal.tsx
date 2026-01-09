import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { KanbanTask, KanbanStatus, kanbanService } from '../../services/kanbanService';
import dayjs from 'dayjs';
import FilePreview from '../common/FilePreview';
import { api } from '../../services/api';

interface Employee {
  _id: string;
  empID: string;
  name: string;
  department?: string;
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: KanbanTask | null;
  onSave: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ open, onClose, task, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<KanbanStatus>('Backlog');
  const [executor, setExecutor] = useState('A540');
  const [executorName, setExecutorName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees');
        const employeeList = response.data.data.employees || [];
        setEmployees(employeeList);

        // Find default employee (A540)
        const defaultEmployee = employeeList.find((emp: Employee) => emp.empID === 'A540');
        if (defaultEmployee && !task) {
          setSelectedEmployee(defaultEmployee);
          setExecutor(defaultEmployee.empID);
          setExecutorName(defaultEmployee.name);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    if (open) {
      fetchEmployees();
    }
  }, [open, task]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setContent(task.content);
      setStatus(task.status);
      setExecutor(task.executor || 'A540');
      setExecutorName(task.executorName || '');

      // Find and set selected employee
      const emp = employees.find((e) => e.empID === task.executor);
      setSelectedEmployee(emp || null);
    } else {
      setTitle('');
      setContent('');
      setStatus('Backlog');
      setExecutor('A540');
      setExecutorName('');
      setFiles([]);

      // Set default employee
      const defaultEmployee = employees.find((emp) => emp.empID === 'A540');
      if (defaultEmployee) {
        setSelectedEmployee(defaultEmployee);
        setExecutorName(defaultEmployee.name);
      }
    }
  }, [task, open, employees]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles([...files, ...Array.from(event.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('請輸入標題');
      return;
    }

    setLoading(true);
    try {
      if (task) {
        // Update existing task
        await kanbanService.updateTask(task._id, {
          title,
          content,
          status,
          executor: executor || undefined,
          executorName: executorName || undefined
        });

        // Upload new files if any
        if (files.length > 0) {
          await kanbanService.uploadFiles(task._id, files);
        }
      } else {
        // Create new task
        const newTask = await kanbanService.createTask({
          title,
          content,
          status,
          executor: executor || undefined,
          executorName: executorName || undefined
        });

        // Upload files if any
        if (files.length > 0) {
          await kanbanService.uploadFiles(newTask._id, files);
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!task) return;

    if (window.confirm('確定要刪除此檔案嗎？')) {
      try {
        await kanbanService.removeFile(task._id, filePath);
        onSave();
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('刪除檔案失敗');
      }
    }
  };

  const handlePreviewFile = (filePath: string) => {
    const fileName = filePath.split('/').pop() || '';
    setPreviewFileName(fileName);
    setPreviewFile(filePath);
  };

  const handleEmployeeChange = (_event: React.SyntheticEvent, value: Employee | null) => {
    setSelectedEmployee(value);
    if (value) {
      setExecutor(value.empID);
      setExecutorName(value.name);
    }
  };

  const handleExecutorIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setExecutor(value);

    // Find matching employee
    const matchingEmployee = employees.find((emp) => emp.empID === value);
    if (matchingEmployee) {
      setSelectedEmployee(matchingEmployee);
      setExecutorName(matchingEmployee.name);
    }
  };

  // Filter employees based on executor input
  const filteredEmployees = employees.filter((emp) =>
    emp.empID.toLowerCase().includes(executor.toLowerCase()) ||
    emp.name.toLowerCase().includes(executor.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{task ? '編輯任務' : '建立新任務'}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="內容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={4}
            maxRows={100}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>狀態</InputLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value as KanbanStatus)} label="狀態">
              <MenuItem value="Backlog">Backlog</MenuItem>
              <MenuItem value="To Do">To Do</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Testing">Testing</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="執行者員工編號"
                value={executor}
                onChange={handleExecutorIdChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={filteredEmployees}
                getOptionLabel={(option) => option.name}
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                renderInput={(params) => (
                  <TextField {...params} label="執行者姓名" />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option._id}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.empID} {option.department && `• ${option.department}`}
                      </Typography>
                    </Box>
                  </li>
                )}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                fullWidth
              />
            </Grid>
          </Grid>

          <Box>
            <Button variant="outlined" component="label" startIcon={<AttachFileIcon />}>
              上傳檔案
              <input type="file" hidden multiple onChange={handleFileChange} />
            </Button>

            {files.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {files.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => handleRemoveFile(index)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {task && task.files.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                已上傳的檔案
              </Typography>
              <List dense>
                {task.files.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={file.split('/').pop()}
                      secondary={
                        <Button
                          size="small"
                          onClick={() => handlePreviewFile(file)}
                          sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
                        >
                          檢視
                        </Button>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleDeleteFile(file)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {task && task.history.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <HistoryIcon />
                  <Typography>歷史記錄 ({task.history.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {task.history.slice().reverse().map((entry, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={entry.details}
                          secondary={`${entry.performedByName} • ${dayjs(entry.timestamp).format('YYYY/MM/DD HH:mm:ss')}`}
                        />
                      </ListItem>
                      {index < task.history.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </DialogActions>

      <FilePreview
        open={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        filePath={previewFile}
        fileName={previewFileName}
      />
    </Dialog>
  );
};

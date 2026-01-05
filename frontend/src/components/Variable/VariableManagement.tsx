import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { Variable } from '../../types';
import { variableAPI } from '../../services/api';
import { toast } from 'react-toastify';
import AddEditVariableDialog from './AddEditVariableDialog';
import { useAuth } from '../../contexts/AuthContext';

const sectionMap = {
  bloodType: "血型",
  education: "學歷",
  gender: "性別",
  jobLevel: "職等",
  jobType: "職稱",
  maritalStatus: "婚姻",
  shift: "班別",
  department: "部門"
}

const VariableManagement: React.FC = () => {
  const { user } = useAuth();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<Variable | null>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);

  // Check if user has admin or HR role
  const canModify = user?.role === 'admin' || user?.role === 'hr';
  const isAdmin = user?.role === 'admin';

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await variableAPI.getSections();
      setSections(response.data.data.sections);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Fetch variables
  const fetchVariables = async () => {
    setLoading(true);
    try {
      const response = await variableAPI.getAll(selectedSection || undefined, includeInactive);
      setVariables(response.data.data.variables);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '載入變數失敗');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSections();
    fetchVariables();
  }, []);

  // Reload when filters change
  useEffect(() => {
    fetchVariables();
  }, [selectedSection, includeInactive]);

  // Handle add/edit
  const handleOpenAddDialog = () => {
    setSelectedVariable(null);
    setAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (variable: Variable) => {
    setSelectedVariable(variable);
    setAddEditDialogOpen(true);
  };

  const handleCloseAddEditDialog = () => {
    setAddEditDialogOpen(false);
    setSelectedVariable(null);
  };

  const handleSaved = () => {
    fetchVariables();
    fetchSections();
  };

  // Handle delete
  const handleOpenDeleteDialog = (variable: Variable) => {
    setVariableToDelete(variable);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setVariableToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!variableToDelete?._id) return;

    try {
      await variableAPI.delete(variableToDelete._id, true); // Hard delete
      toast.success('變數已刪除');
      fetchVariables();
      handleCloseDeleteDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '刪除變數失敗');
    }
  };

  // Handle seed
  const handleOpenSeedDialog = () => {
    setSeedDialogOpen(true);
  };

  const handleCloseSeedDialog = () => {
    setSeedDialogOpen(false);
  };

  const handleConfirmSeed = async () => {
    try {
      await variableAPI.seed();
      toast.success('變數資料已初始化');
      fetchVariables();
      fetchSections();
      handleCloseSeedDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '初始化變數失敗');
    }
  };

  // Filter variables by search query
  const filteredVariables = variables.filter(v =>
    v.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.code2 && v.code2.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.memo && v.memo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            變數管理
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isAdmin && (
              <Button
                sx={{ display: "none" }}
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleOpenSeedDialog}
                color="secondary"
              >
                初始化資料
              </Button>
            )}
            {canModify && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddDialog}
              >
                新增變數
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>分類篩選</InputLabel>
              <Select
                value={selectedSection}
                label="分類篩選"
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <MenuItem value="">全部分類</MenuItem>
                {sections.map((section) => (
                  <MenuItem key={section} value={section}>
                    {sectionMap[section as keyof typeof sectionMap] || section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="搜尋"
              placeholder="搜尋分類、代碼、說明..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                }
                label="顯示停用"
              />
              <Tooltip title="重新載入">
                <IconButton onClick={fetchVariables} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>分類</TableCell>
                <TableCell>代碼</TableCell>
                <TableCell>次要代碼</TableCell>
                <TableCell>說明</TableCell>
                <TableCell>備註</TableCell>
                <TableCell>狀態</TableCell>
                {canModify && <TableCell align="center">操作</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 7 : 6} align="center">
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : filteredVariables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModify ? 7 : 6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      沒有找到變數
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVariables.map((variable) => (
                  <TableRow key={variable._id} hover>
                    <TableCell>
                      <Chip
                        label={sectionMap[variable.section as keyof typeof sectionMap] || variable.section}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {variable.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {variable.code2 || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {variable.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {variable.memo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={variable.isActive ? '啟用' : '停用'}
                        size="small"
                        color={variable.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    {canModify && (
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="編輯">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(variable)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip title="刪除">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteDialog(variable)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            共 {filteredVariables.length} 筆變數
          </Typography>
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <AddEditVariableDialog
        open={addEditDialogOpen}
        variable={selectedVariable}
        onClose={handleCloseAddEditDialog}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除變數 <strong>{variableToDelete && (sectionMap[variableToDelete.section as keyof typeof sectionMap] || variableToDelete.section)} - {variableToDelete?.code}</strong> 嗎？
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            此操作將永久刪除變數，無法復原！
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>取消</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            確認刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Seed Confirmation Dialog */}
      <Dialog open={seedDialogOpen} onClose={handleCloseSeedDialog}>
        <DialogTitle>初始化變數資料</DialogTitle>
        <DialogContent>
          <Typography>
            確定要初始化變數資料嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            這將會新增預設的變數資料（職別、職等、班別、學歷、血型、性別、婚姻狀態）。
            如果資料已存在，則不會重複新增。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSeedDialog}>取消</Button>
          <Button onClick={handleConfirmSeed} color="primary" variant="contained">
            確認初始化
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VariableManagement;

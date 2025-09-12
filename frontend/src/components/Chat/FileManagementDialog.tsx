import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Fab,
  TextField,
  Tab,
  Tabs,
  Paper,
  Backdrop,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentAPI, conversationAPI } from '../../services/api';
import { Document, Conversation } from '../../types';
import toast from 'react-hot-toast';
import FilePreview from './FilePreview';

interface FileManagementDialogProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onConversationUpdate: (conversation: Conversation) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-tabpanel-${index}`}
      aria-labelledby={`file-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const FileManagementDialog: React.FC<FileManagementDialogProps> = ({
  open,
  onClose,
  conversation,
  onConversationUpdate,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents, isLoading: loadingDocuments, refetch } = useQuery<Document[]>({
    queryKey: ['documents', conversation.id],
    queryFn: () => documentAPI.listDocuments(conversation.id).then(res => res.data),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, conversationId }: { file: File; conversationId: number }) =>
      documentAPI.uploadDocument(conversationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', conversation.id] });
      setUploadingFileName('');
      toast.success('檔案上傳成功');
      setTimeout(() => { refetch(); }, 1000);
    },
    onError: (error: any) => {
      setUploadingFileName('');
      toast.error(error.response?.data?.error || '檔案上傳失敗');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentAPI.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', conversation.id] });
      toast.success('檔案刪除成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '檔案刪除失敗');
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      conversationAPI.updateConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onConversationUpdate({ ...conversation, title: newTitle });
      setEditingTitle(false);
      toast.success('標題更新成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '標題更新失敗');
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadingFileName(file.name);
      uploadMutation.mutate({ file, conversationId: conversation.id });
    }
    // Reset the input value so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleDeleteDocument = (documentId: number) => {
    if (window.confirm('確定要刪除這個檔案嗎？')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleSaveTitle = () => {
    if (newTitle.trim() && newTitle !== conversation.title) {
      updateTitleMutation.mutate({ id: conversation.id, title: newTitle.trim() });
    } else {
      setEditingTitle(false);
    }
  };

  const handleCancelEditTitle = () => {
    setNewTitle(conversation.title);
    setEditingTitle(false);
  };

  const handlePreviewDocument = (document: Document) => {
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewDocument(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="檔案管理" />
            <Tab label="對話設定" />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 400 }}>
        <TabPanel value={tabValue} index={0}>
          {/* File Management Tab */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              對話檔案
            </Typography>

            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Fab
                color="primary"
                component="span"
                variant="extended"
                size="small"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                ) : (
                  <UploadIcon sx={{ mr: 1 }} />
                )}
                {uploadMutation.isPending ? '上傳中...' : '上傳檔案'}
              </Fab>
            </label>
          </Box>

          {loadingDocuments ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : documents && documents.length > 0 ? (
            <Paper variant="outlined">
              <List>
                {documents.map((doc, index) => (
                  <ListItem 
                    key={doc.document_id} 
                    divider={index < documents.length - 1}
                    button
                    onClick={() => handlePreviewDocument(doc)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <FileIcon sx={{ mr: 2, color: 'text.secondary' }} />
                    <ListItemText
                      primary={doc.original_name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            大小: {formatFileSize(doc.file_size)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            上傳時間: {new Date(doc.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewDocument(doc);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <PreviewIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.document_id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Alert severity="info">
              此對話尚未上傳任何檔案
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Conversation Settings Tab */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              對話標題
            </Typography>

            {editingTitle ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <IconButton
                  color="primary"
                  onClick={handleSaveTitle}
                  disabled={updateTitleMutation.isPending}
                >
                  <SaveIcon />
                </IconButton>
                <IconButton onClick={handleCancelEditTitle}>
                  <CancelIcon />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {conversation.title}
                </Typography>
                <IconButton onClick={() => setEditingTitle(true)}>
                  <EditIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              對話資訊
            </Typography>
            <Typography variant="body2" color="text.secondary">
              建立時間: {new Date(conversation.created_at).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最後更新: {new Date(conversation.updated_at).toLocaleString()}
            </Typography>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={uploadMutation.isPending}>
          關閉
        </Button>
      </DialogActions>

      {/* Upload Loading Backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.modal + 1,
          position: 'absolute'
        }}
        open={uploadMutation.isPending}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            檔案上傳中...
          </Typography>
          {uploadingFileName && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {uploadingFileName}
            </Typography>
          )}
        </Box>
      </Backdrop>

      {/* File Preview Dialog */}
      <FilePreview
        open={previewOpen}
        onClose={handleClosePreview}
        document={previewDocument}
      />
    </Dialog>
  );
};

export default FileManagementDialog;
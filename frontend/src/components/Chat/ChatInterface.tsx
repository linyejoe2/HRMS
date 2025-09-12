import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Button,
  Grid,
  Backdrop,
  Chip,
  Tooltip,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as FileIcon,
  // QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiAPI, conversationAPI, documentAPI } from '../../services/api';
import { Message, AIModel, Document, ContextChunk } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useConversation } from '../../contexts/ConversationContext';
import FilePreview from './FilePreview';
import toast from 'react-hot-toast';

const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(AIModel.CHATGPT);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { currentConversation, setCurrentConversation } = useConversation();
  const queryClient = useQueryClient();

  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', currentConversation?.id],
    queryFn: () =>
      currentConversation
        ? conversationAPI.getMessages(currentConversation.id).then(res => res.data)
        : Promise.resolve([]),
    enabled: !!currentConversation,
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ['documents', currentConversation?.id],
    queryFn: () =>
      currentConversation
        ? documentAPI.listDocuments(currentConversation.id).then(res => res.data)
        : Promise.resolve([]),
    enabled: !!currentConversation,
  });

  // const { data: aiHealth } = useQuery({
  //   queryKey: ['ai-health'],
  //   queryFn: () => aiAPI.checkHealth().then(res => res.data),
  //   refetchInterval: 30010,
  // });

  const { data: modelsHealth, isLoading: loadingModelsHealth } = useQuery({
    queryKey: ['models-health'],
    queryFn: () => aiAPI.checkAllModelsHealth().then(res => res.data),
    refetchInterval: 300000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: aiAPI.sendMessage,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', variables.conversation_id] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', variables.conversation_id]);
      
      // Optimistically update to the new value
      if (variables.conversation_id) {
        const optimisticUserMessage: Message = {
          id: Date.now(), // Temporary ID
          conversation_id: variables.conversation_id,
          content: variables.message,
          role: 'user',
          created_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData<Message[]>(
          ['messages', variables.conversation_id],
          (old) => [...(old || []), optimisticUserMessage]
        );
      }
      
      // Return a context object with the snapshotted value
      return { previousMessages, conversationId: variables.conversation_id };
    },
    onError: (err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.conversationId) {
        queryClient.setQueryData(['messages', context.conversationId], context.previousMessages);
      }
      console.error('Send message error:', err);
      const errorMessage = (err as any).response?.data?.error || 'Failed to send message';
      toast.error(errorMessage);
    },
    onSuccess: (response) => {
      if (!currentConversation || response.data.conversation_id !== currentConversation.id) {
        const newConversation = {
          id: response.data.conversation_id,
          user_id: user!.id,
          title: 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCurrentConversation(newConversation);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      // Invalidate and refetch to get the real messages from the server
      queryClient.invalidateQueries({ queryKey: ['messages', response.data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['documents', response.data.conversation_id] });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      if (currentConversation) {
        queryClient.invalidateQueries({ queryKey: ['messages', currentConversation.id] });
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (modelsHealth && !modelsHealth[selectedModel]) {
      // Find the first available model
      const availableModel = Object.entries(modelsHealth).find(([_, isHealthy]) => isHealthy)?.[0] as AIModel;
      if (availableModel) {
        setSelectedModel(availableModel);
        toast.success(`自動切換到可用模型: ${availableModel.toUpperCase()}`);
      }
    }
  }, [modelsHealth, selectedModel]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageText = message.trim();
    setMessage(''); // Always clear input immediately for better UX

    sendMessageMutation.mutate({
      message: messageText,
      conversation_id: currentConversation?.id,
      model: selectedModel,
    });
  };

  const sendAutoQuestion = (question: string) => {
    setMessage(question);
    // Auto submit the question
    // sendMessageMutation.mutate({
    //   message: question,
    //   conversation_id: currentConversation?.id,
    //   model: selectedModel,
    // });
    setSuggestionsOpen(false); // Close suggestions after selecting
  };

  const suggestedQuestions = [
    "請簡述一下目前現有的證據，你認為可以打哪些項目。",
  ];

  // const startNewConversation = () => {
  //   setCurrentConversation(null);
  //   setMessage('');
  // };

  const formatMessageContent = (content: string, isAssistant: boolean = false) => {
    if (isAssistant) {
      // Use Markdown for assistant messages
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom styling for different markdown elements
            h1: ({ children }) => (
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                {children}
              </Typography>
            ),
            h2: ({ children }) => (
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                {children}
              </Typography>
            ),
            h3: ({ children }) => (
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                {children}
              </Typography>
            ),
            p: ({ children }) => (
              <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.6 }}>
                {children}
              </Typography>
            ),
            ul: ({ children }) => (
              <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                {children}
              </Box>
            ),
            ol: ({ children }) => (
              <Box component="ol" sx={{ pl: 2, mb: 1 }}>
                {children}
              </Box>
            ),
            li: ({ children }) => (
              <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                {children}
              </Typography>
            ),
            blockquote: ({ children }) => (
              <Box
                sx={{
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  pl: 2,
                  ml: 1,
                  py: 1,
                  backgroundColor: 'grey.50',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </Box>
            ),
            code: ({ node, className, children, ...props }: any) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <Box
                    component="code"
                    sx={{
                      backgroundColor: 'grey.100',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {children}
                  </Box>
                );
              }
              return (
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: 'grey.900',
                    color: 'grey.100',
                    padding: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    mb: 1,
                  }}
                >
                  <code className={className} {...props}>
                    {children}
                  </code>
                </Box>
              );
            },
            strong: ({ children }) => (
              <Typography component="strong" sx={{ fontWeight: 'bold' }}>
                {children}
              </Typography>
            ),
            em: ({ children }) => (
              <Typography component="em" sx={{ fontStyle: 'italic' }}>
                {children}
              </Typography>
            ),
            table: ({ children }) => (
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  mb: 1,
                  '& th': {
                    backgroundColor: 'grey.100',
                    fontWeight: 'bold',
                    padding: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                  },
                  '& td': {
                    padding: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                  },
                }}
              >
                {children}
              </Box>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      );
    } else {
      // Keep simple formatting for user messages
      return content.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
    }
  };

  const handlePreviewDocument = (documentId: number) => {
    const document = documents?.find(doc => doc.document_id === documentId);
    if (document) {
      setPreviewDocument(document);
      setPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewDocument(null);
  };

  const getDocumentByChunk = (chunk: ContextChunk): Document | null => {
    return documents?.find(doc => doc.document_id === chunk.document_id) || null;
  };

  const renderSourceQuotes = (contextChunks: ContextChunk[]) => {
    if (!contextChunks || contextChunks.length === 0) return null;

    // Group chunks by document to avoid duplicate file links
    const documentChunks = contextChunks.reduce((acc: Record<number, ContextChunk[]>, chunk) => {
      if (!acc[chunk.document_id]) {
        acc[chunk.document_id] = [];
      }
      acc[chunk.document_id].push(chunk);
      return acc;
    }, {});

    return (
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          參考資料來源：
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {Object.entries(documentChunks).map(([documentId, chunks]) => {
            const document = getDocumentByChunk(chunks[0]);
            const chunkCount = chunks.length;
            
            return document ? (
              <Tooltip
                key={documentId}
                title={`來自文件：${document.original_name}，${chunkCount} 個相關段落`}
                arrow
              >
                <Chip
                  icon={<FileIcon />}
                  label={`${document.original_name}${chunkCount > 1 ? ` (${chunkCount})` : ''}`}
                  variant="outlined"
                  size="small"
                  onClick={() => handlePreviewDocument(parseInt(documentId))}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              </Tooltip>
            ) : null;
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      {/* <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
        　
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<BotIcon />}
            label={aiHealth?.ai_service === 'available' ? 'AI Online' : 'AI Offline'}
            color={aiHealth?.ai_service === 'available' ? 'success' : 'error'}
            variant="outlined"
          />
          
          <Button
            variant="outlined"
            onClick={startNewConversation}
            startIcon={<RefreshIcon />}
          >
            新對話
          </Button>
        </Box>
      </Box> */}

      {!modelsHealth?.[selectedModel] && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          所選的 AI 模型 ({selectedModel.toUpperCase()}) 目前暫不可用，請選擇其他模型或稍後再試。
        </Alert>
      )}

      <Paper
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            backgroundColor: '#fafafa',
          }}
        >
          {loadingMessages ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : messages && messages.length > 0 ? (
            messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      // display: 'flex',
                      display: 'none', // temporary hide this UI
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: msg.role === 'user' ? '#1976d2' : '#4caf50',
                      color: 'white',
                    }}
                  >
                    {msg.role === 'user' ? <PersonIcon /> : <BotIcon />}
                  </Box>

                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ '& > *:last-child': { mb: 0 } }}>
                      {formatMessageContent(msg.content, msg.role === 'assistant')}
                    </Box>
                    
                    {/* Show source quotes for assistant messages with context chunks */}
                    {msg.role === 'assistant' && msg.context_chunks && renderSourceQuotes(msg.context_chunks)}
                    
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            ))
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
              }}
            >
              <BotIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                歡迎使用律師助手
              </Typography>
              <Typography variant="body2" color="text.secondary">
                問我跟案件有關的任何問題，我將根據專業法律知識以及我手上有的資料給予回覆。
              </Typography>
            </Box>
          )}

          {sendMessageMutation.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#4caf50',
                    color: 'white',
                  }}
                >
                  <BotIcon />
                </Box>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                    思考中...
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Suggested Questions Drawer */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', display: "none" }}>
          <Box sx={{ display: "flex", justifyContent: "center"}}>
            <IconButton
              type="submit"
              color="primary"
              onClick={() => setSuggestionsOpen(!suggestionsOpen)}
              sx={{ alignSelf: 'flex-end' }}
            >
              {suggestionsOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          </Box>

          <Collapse in={suggestionsOpen}>
            <Box sx={{ p: 2, backgroundColor: 'grey.25' }}>
              <Grid container spacing={1}>
                {suggestedQuestions.map((question, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => sendAutoQuestion(question)}
                      sx={{
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        minHeight: '60px',
                        px: 2,
                        py: 1,
                        color: 'text.primary',
                        borderColor: 'grey.300',
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          backgroundColor: 'grey.100',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          textTransform: 'none',
                          textAlign: 'left',
                          lineHeight: 1.4,
                          whiteSpace: 'normal',
                        }}
                      >
                        {question}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2 }}>
          {/* <Box sx={{ mb: 2 }}>
          </Box> */}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ display: 'flex', mr: 2, flexDirection: "row" }}>
              <InputLabel>AI 模型</InputLabel>
              <Select
                value={selectedModel}
                label="AI 模型"
                onChange={(e) => setSelectedModel(e.target.value as AIModel)}
              >
                <MenuItem
                  value={AIModel.OLLAMA}
                  disabled={!modelsHealth?.[AIModel.OLLAMA]}
                >
                  gpt-oss-20b {!modelsHealth?.[AIModel.OLLAMA] && '(離線)'}
                </MenuItem>
                <MenuItem
                  value={AIModel.CHATGPT}
                  disabled={!modelsHealth?.[AIModel.CHATGPT]}
                >
                  gpt-4o-mini {!modelsHealth?.[AIModel.CHATGPT] && '(離線)'}
                </MenuItem>
                <MenuItem
                  value={AIModel.gpt5nano}
                  disabled={!modelsHealth?.[AIModel.gpt5nano]}
                >
                  gpt-5-nano {!modelsHealth?.[AIModel.gpt5nano] && '(離線)'}
                </MenuItem>
                {/* <MenuItem
                  value={AIModel.DEEPSEEK}
                  disabled={!modelsHealth?.[AIModel.DEEPSEEK]}
                >
                  DeepSeek {!modelsHealth?.[AIModel.DEEPSEEK] && '(離線)'}
                </MenuItem> */}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="問我跟案件或法律有關的任何問題..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending || !modelsHealth?.[selectedModel]}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Box sx={{ margin: "auto" }}>
              <IconButton
                type="submit"
                color="primary"
                disabled={
                  !message.trim() ||
                  sendMessageMutation.isPending ||
                  !modelsHealth?.[selectedModel]
                }
                sx={{ alignSelf: 'flex-end' }}
              >
                {sendMessageMutation.isPending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Backdrop with loading circle for initial model health check */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loadingModelsHealth}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="inherit" size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            正在檢查 AI 模型可用性...
          </Typography>
        </Box>
      </Backdrop>

      {/* File Preview Dialog */}
      <FilePreview
        open={previewOpen}
        onClose={handleClosePreview}
        document={previewDocument}
      />
    </Box>
  );
};

export default ChatInterface;
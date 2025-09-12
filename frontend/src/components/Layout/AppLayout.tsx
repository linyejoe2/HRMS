import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Chat as ChatIcon,
  // History as HistoryIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DocumentScanner as PanIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConversation } from '../../contexts/ConversationContext';
import { UserLevel, Conversation } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const DRAWER_WIDTH = 280;

const AppLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentConversation, setCurrentConversation } = useConversation();
  const queryClient = useQueryClient();

  const isOnChatPage = true;
  // const isOnChatPage = location.pathname === '/chat' || location.pathname === '/';

  const { data: conversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => conversationAPI.getConversations().then(res => res.data),
    enabled: !!user && isOnChatPage,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: conversationAPI.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (currentConversation && conversations && conversations.length > 1) {
        const otherConversation = conversations.find(c => c.id !== currentConversation.id);
        setCurrentConversation(otherConversation || null);
      } else {
        setCurrentConversation(null);
      }
      toast.success('對話已刪除');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '刪除對話失敗');
    },
  });

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除這個對話嗎？')) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const formatConversationTitle = (conversation: Conversation) => {
    if (conversation.title !== 'New Conversation') {
      return conversation.title;
    }
    return `對話 ${new Date(conversation.created_at).toLocaleDateString()}`;
  };

  const getUserLevelText = (level: UserLevel): string => {
    switch (level) {
      case UserLevel.LAWYER:
        return 'Lawyer';
      case UserLevel.CO_LAWYER:
        return 'Co-Lawyer';
      case UserLevel.LAWYER_ASSISTANT:
        return 'Assistant';
      case UserLevel.CLIENT:
        return 'Client';
      default:
        return 'User';
    }
  };

  const getUserLevelColor = (level: UserLevel): string => {
    switch (level) {
      case UserLevel.LAWYER:
        return '#1976d2';
      case UserLevel.CO_LAWYER:
        return '#388e3c';
      case UserLevel.LAWYER_ASSISTANT:
        return '#f57c00';
      case UserLevel.CLIENT:
        return '#7b1fa2';
      default:
        return '#666';
    }
  };

  const menuItems = [
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
    // { text: 'History', icon: <HistoryIcon />, path: '/history' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {user && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Avatar
            sx={{
              bgcolor: getUserLevelColor(user.level),
              mx: 'auto',
              mb: 1,
              width: 56,
              height: 56,
            }}
          >
            {user.account.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold">
            {user.account}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: getUserLevelColor(user.level), fontWeight: 'medium' }}
          >
            {getUserLevelText(user.level)}
          </Typography>
        </Box>
      )}
      
      <Divider />
      
      {/* Navigation Menu */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setDrawerOpen(false);
                }
              }}
              sx={{
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main + '20',
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'bold',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Chat Conversations Section - Only show on chat page */}
      {isOnChatPage && (
        <>
          <Divider />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              對話紀錄
            </Typography>
            <Tooltip title="新增對話">
              <IconButton onClick={handleNewConversation} size="small" color="primary">
                <AddIcon />
              </IconButton> 
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {conversations && conversations.length > 0 ? (
              <List dense>
                {conversations.map((conversation) => (
                  <ListItem
                    key={conversation.id}
                    disablePadding
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          edge="end"
                          size="small"
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <PanIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleDeleteConversation(e, conversation.id)}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemButton
                      selected={currentConversation?.id === conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      sx={{
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          },
                        },
                      }}
                    >
                      <ListItemText
                        primary={formatConversationTitle(conversation)}
                        secondary={new Date(conversation.updated_at).toLocaleDateString()}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: currentConversation?.id === conversation.id ? 'bold' : 'normal',
                          noWrap: true,
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: {
                            color: currentConversation?.id === conversation.id 
                              ? 'primary.contrastText' 
                              : 'text.secondary',
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  尚無對話紀錄
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2 }}>
            <Fab
              variant="extended"
              color="primary"
              onClick={handleNewConversation}
              sx={{ width: '100%' }}
              size="small"
            >
              <AddIcon sx={{ mr: 1 }} />
              新增對話
            </Fab>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerOpen ? DRAWER_WIDTH : 0}px)` },
          ml: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          borderRadius: 0
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            律師助手
          </Typography>
          
          {user && (
            <>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="profile-menu"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <Avatar
                  sx={{
                    bgcolor: getUserLevelColor(user.level),
                    width: 32,
                    height: 32,
                  }}
                >
                  {user.account.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              
              <Menu
                id="profile-menu"
                anchorEl={profileMenuAnchor}
                open={Boolean(profileMenuAnchor)}
                onClose={handleProfileMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={() => {
                  handleProfileMenuClose();
                  navigate('/settings');
                }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>登出</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ 
          width: {
            xs: 0, // On small screens, always 0 (drawer is temporary anyway)
            md: drawerOpen ? `${DRAWER_WIDTH}px` : 0, // On desktop, respect drawerOpen
          },
          flexShrink: { md: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={isMobile ? drawerOpen : drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerOpen ? DRAWER_WIDTH : 0}px)` },
          height: '100vh',
          bgcolor: theme.palette.background.default,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
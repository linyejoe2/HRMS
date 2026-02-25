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
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  EventNote as AttendanceIcon,
  Group as EmployeeIcon,
  BeachAccess as LeaveIcon,
  Assignment as ApprovalIcon,
  EditCalendar as PostClockIcon,
  Work as BusinessTripIcon,
  DirectionsCar as OfficialBusinessIcon,
  Storage as VariableIcon,
  CalendarMonth as CalendarIcon,
  ExpandLess,
  ExpandMore,
  Download,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserLevel } from '../../types';

const DRAWER_WIDTH = 280;

const AppLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [approvalMenuOpen, setApprovalMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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


  const getUserLevelText = (level: UserLevel): string => {
    switch (level) {
      case UserLevel.ADMIN:
        return '管理員';
      case UserLevel.HR:
        return '人資';
      case UserLevel.EMPLOYEE:
        return '員工';
      case UserLevel.MANAGER:
        return '主管';
    }
  };

  const getUserLevelColor = (level: UserLevel): string => {
    switch (level) {
      case UserLevel.HR:
        return '#1976d2';
      case UserLevel.EMPLOYEE:
        return '#388e3c';
      case UserLevel.ADMIN:
        return '#f57c00';
      case UserLevel.MANAGER:
        return '#7b1fa2';
      default:
        return '#666';
    }
  };

  // Get menu items based on user role
  interface MenuItem {
    text: string;
    icon: React.ReactElement;
    path?: string;
    subItems?: { text: string; path: string }[];
  }

  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { text: '出勤管理', icon: <AttendanceIcon />, path: '/attendance' },
    ];

    // Add Leave Request for all users
    baseItems.push({
      text: '請假申請',
      icon: <LeaveIcon />,
      path: '/leave/ask'
    });

    // Add PostClock Request for all users
    baseItems.push({
      text: '補單申請',
      icon: <PostClockIcon />,
      path: '/postclock'
    });

    baseItems.push({
      text: '出差申請',
      icon: <BusinessTripIcon />,
      path: '/business-trip'
    });

    baseItems.push({
      text: '外出申請',
      icon: <OfficialBusinessIcon />,
      path: '/officialbusiness'
    });

    // Add Employee Management for HR and Admin only
    if (user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR) {
      // Add Approval Center with sub-items for HR and Admin only
      baseItems.push({
        text: '審核中心',
        icon: <ApprovalIcon />,
        path: '/leave/approve?tab=leave',
        subItems: [
          { text: '請假審核', path: '/leave/approve?tab=leave' },
          { text: '補單審核', path: '/leave/approve?tab=postclock' },
          { text: '出差審核', path: '/leave/approve?tab=travel' },
          { text: '外出審核', path: '/leave/approve?tab=officialbusiness' },
        ]
      });

      baseItems.push({
        text: '員工管理',
        icon: <EmployeeIcon />,
        path: '/employees'
      });
    }

       // Variable Management for Admin only
    if (user?.role === UserLevel.ADMIN) {
      baseItems.push({
        text: '變數管理',
        icon: <VariableIcon />,
        path: '/variables'
      });
    }

    // Holiday Management for HR and Admin only
    if (user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR) {
      baseItems.push({
        text: '假日管理',
        icon: <CalendarIcon />,
        path: '/calendar'
      });
      baseItems.push({
        text: '表單下載',
        icon: <Download />,
        path: '/download'
      });
    }

    baseItems.push({ text: '設定', icon: <SettingsIcon />, path: '/settings' });

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleApprovalMenuToggle = () => {
    setApprovalMenuOpen(!approvalMenuOpen);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {user && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Avatar
            sx={{
              bgcolor: getUserLevelColor(user.role),
              mx: 'auto',
              mb: 1,
              width: 56,
              height: 56,
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : user.empID.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold">
            {user.name || user.empID}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: getUserLevelColor(user.role), fontWeight: 'medium' }}
          >
            {getUserLevelText(user.role)}
          </Typography>
        </Box>
      )}
      
      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            <ListItem disablePadding>
              <ListItemButton
                selected={item.path ? location.pathname === item.path : false}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                    if (isMobile) {
                      setDrawerOpen(false);
                    }
                  }
                  
                  if (item.subItems) {
                    handleApprovalMenuToggle();
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
                {item.subItems && (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // ✅ Prevent parent onClick
                      handleApprovalMenuToggle(); // 🔁 Toggle submenu
                    }}
                  >
                    {approvalMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
              </ListItemButton>
            </ListItem>

            {/* Render sub-items if they exist */}
            {item.subItems && (
              <Collapse in={approvalMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.subItems.map((subItem) => (
                    <ListItemButton
                      key={subItem.text}
                      sx={{ pl: 4 }}
                      selected={location.pathname + location.search === subItem.path}
                      onClick={() => {
                        navigate(subItem.path);
                        if (isMobile) {
                          setDrawerOpen(false);
                        }
                      }}
                    >
                      <ListItemText primary={subItem.text} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>
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
            臺龍電子人資系統
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
                    bgcolor: getUserLevelColor(user.role),
                    width: 32,
                    height: 32,
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : user.empID.charAt(0).toUpperCase()}
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
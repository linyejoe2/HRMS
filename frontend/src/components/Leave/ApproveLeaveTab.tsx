import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import ApproveLeaveList from './ApproveLeaveList';
import ApprovePostClockList from './ApprovePostClockList';

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
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `approval-tab-${index}`,
    'aria-controls': `approval-tabpanel-${index}`,
  };
}

const ApproveLeaveTab: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        審核中心
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="審核類型">
          <Tab label="請假審核" {...a11yProps(0)} />
          <Tab label="補卡審核" {...a11yProps(1)} />
          <Tab label="出差審核" {...a11yProps(2)} disabled />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ApproveLeaveList />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ApprovePostClockList />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>出差審核功能即將推出...</Typography>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default ApproveLeaveTab;

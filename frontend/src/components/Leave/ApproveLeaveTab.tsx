import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ApproveLeaveList from './ApproveLeaveList';
import ApprovePostClockList from '../PostClock/ApprovePostClockList';
import ApproveBusinessTripList from '../BusinessTrip/ApproveBusinessTripList';
import ApproveOfficialBusinessTab from '../OfficialBusiness/ApproveOfficialBusinessTab';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');

  // Map tab parameter to index
  const getTabIndex = (tab: string | null): number => {
    switch (tab) {
      case 'leave':
        return 0;
      case 'postclock':
        return 1;
      case 'travel':
        return 2;
      case 'officialbusiness':
        return 3;
      default:
        return 0;
    }
  };

  const [tabValue, setTabValue] = useState(getTabIndex(tabParam));

  // Update tab when URL parameter changes
  useEffect(() => {
    setTabValue(getTabIndex(tabParam));
  }, [tabParam]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL parameter
    const tabNames = ['leave', 'postclock', 'travel', 'officialbusiness'];
    navigate(`/leave/approve?tab=${tabNames[newValue]}`, { replace: true });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        審核中心
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="審核類型">
          <Tab label="請假審核" {...a11yProps(0)} />
          <Tab label="補單審核" {...a11yProps(1)} />
          <Tab label="出差審核" {...a11yProps(2)} />
          <Tab label="外出審核" {...a11yProps(3)} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ApproveLeaveList />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ApprovePostClockList />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <ApproveBusinessTripList />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <ApproveOfficialBusinessTab />
      </TabPanel>
    </Box>
  );
};

export default ApproveLeaveTab;

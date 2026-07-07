import React from 'react';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';

const navigationItems = [
  { label: 'Overview', icon: DashboardRoundedIcon, key: 'overview' },
  { label: 'Agents', icon: GroupRoundedIcon, key: 'agents' },
  { label: 'Shops', icon: StorefrontRoundedIcon, key: 'shops' },
  { label: 'Items', icon: Inventory2RoundedIcon, key: 'items' },
  { label: 'Orders', icon: ReceiptLongRoundedIcon, key: 'orders' },
  { label: 'Reports', icon: AssessmentRoundedIcon, key: 'reports' },
];

function SidebarNavigation({ open, onClose, width = 280, selectedView = 'overview', onNavigate }) {
  const drawerContent = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2} sx={{ p: 3, pt: 4 }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
            Rice Mill
          </Typography>
          <Typography variant="h6">Operations Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Smart order and procurement visibility
          </Typography>
        </Box>
        <Divider />
        <List disablePadding>
          {navigationItems.map(({ label, icon: Icon, key }) => {
            const isActive = selectedView === key;
            return (
              <ListItem key={label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  sx={{ borderRadius: 2, bgcolor: isActive ? 'primary.light' : 'transparent', color: isActive ? 'primary.contrastText' : 'text.primary' }}
                  onClick={() => {
                    onNavigate?.(key);
                    onClose();
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'primary.contrastText' : 'text.secondary', minWidth: 40 }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Stack>
    </Box>
  );

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', lg: 'none' },
        '& .MuiDrawer-paper': { boxSizing: 'border-box', width },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default SidebarNavigation;

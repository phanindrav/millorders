import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SidebarNavigation from './components/SidebarNavigation';
import StatCard from './components/StatCard';
import DataTable from './components/DataTable';
import OrdersPanel from './components/OrdersPanel';
import ShopsPanel from './components/ShopsPanel';
import AgentsPanel from './components/AgentsPanel';
import ItemsPanel from './components/ItemsPanel';
import ReportsPanel from './components/ReportsPanel';
import LoginPage from './components/LoginPage';

const apiBase = 'http://localhost:3000';
const api = {
  agents: `${apiBase}/api/agents`,
  shops: `${apiBase}/api/shops`,
  items: `${apiBase}/api/items`,
  orders: `${apiBase}/api/orders/1`,
};

function App() {
  const [agents, setAgents] = useState([]);
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('authUser');
    return token && user ? { token, user: JSON.parse(user) } : null;
  });

  useEffect(() => {
    if (!auth?.token) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const [agentsResponse, shopsResponse, itemsResponse, ordersResponse] = await Promise.all([
          fetch(api.agents, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.shops, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.items, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.orders, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);

        const [agentsData, shopsData, itemsData, ordersData] = await Promise.all([
          agentsResponse.json(),
          shopsResponse.json(),
          itemsResponse.json(),
          ordersResponse.json(),
        ]);

        setAgents(agentsData || []);
        setShops(shopsData || []);
        setItems(itemsData || []);
        setOrders(ordersData || []);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [auth?.token]);

  const summaryCards = useMemo(
    () => [
      { title: 'Active Agents', value: agents.length, subtitle: 'Business partners', icon: GroupRoundedIcon, color: 'primary' },
      { title: 'Registered Shops', value: shops.length, subtitle: 'Distribution points', icon: StorefrontRoundedIcon, color: 'secondary' },
      { title: 'Inventory Items', value: items.length, subtitle: 'Rice and brands', icon: Inventory2RoundedIcon, color: 'success' },
      { title: 'Pending Orders', value: orders.length, subtitle: 'Need dispatch', icon: ReceiptLongRoundedIcon, color: 'warning' },
    ],
    [agents.length, shops.length, items.length, orders.length]
  );

  const recentOrders = useMemo(
    () =>
      orders.slice(0, 6).map((order, index) => ({
        id: order.OrderId || index,
        agent: order.AgentName || '—',
        shop: order.ShopName || '—',
        place: order.Place || '—',
        items: order.Items || '—',
        amount: order.TotalAmount ? `₹${order.TotalAmount}` : '—',
      }))
    [orders]
  );

  const handleLogin = (user, token) => {
    localStorage.setItem('jwtToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
    setAuth({ token, user });
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('authUser');
    setAuth(null);
  };

  if (!auth?.token) {
    return <LoginPage onSuccess={handleLogin} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SidebarNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} selectedView={activeView} onNavigate={(view) => setActiveView(view)} />
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
        <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
          <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)} sx={{ mr: 1, display: { lg: 'none' } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <TrendingUpRoundedIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">Krishna Prabhas Order Management System</Typography>
              <Typography variant="body2" color="text.secondary">Responsive operations dashboard</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="secondary" onClick={handleLogout}>
              Logout
            </Button>
            <Button variant={activeView === 'overview' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('overview')}>
              Overview
            </Button>
            <Button variant={activeView === 'orders' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('orders')}>
              Orders
            </Button>
            <Button variant={activeView === 'agents' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('agents')}>
              Agents
            </Button>
            <Button variant={activeView === 'shops' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('shops')}>
              Shops
            </Button>
            <Button variant={activeView === 'items' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('items')}>
              Items
            </Button>
            <Button variant={activeView === 'reports' ? 'contained' : 'outlined'} color="primary" onClick={() => setActiveView('reports')}>
              Reports
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, mb: 3, bgcolor: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.4 }}>
                Daily command center
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                Monitor agents, shops, stock and deliveries in one place.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
                A professional control panel designed for rapid decision-making across procurement, order fulfillment and partner management.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5}>
                <Button variant="contained" size="large">Create New Order</Button>
                <Button variant="outlined" size="large">View Analytics</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {summaryCards.map((card) => (
            <Grid item xs={12} sm={6} lg={3} key={card.title}>
              <StatCard {...card} value={loading ? '—' : card.value} subtitle={loading ? 'Loading...' : card.subtitle} />
            </Grid>
          ))}
        </Grid>

        {activeView === 'overview' ? (
          <Grid container spacing={2.5}>
            <Grid item xs={12} lg={8}>
              <DataTable
                title="Pending orders"
                subtitle="Latest active operations requiring attention"
                rows={recentOrders}
                columns={[
                  { key: 'agent', label: 'Agent' },
                  { key: 'shop', label: 'Shop' },
                  { key: 'place', label: 'Place' },
                  { key: 'amount', label: 'Amount' },
                ]}
              />
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">Operational status</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Your team is aligned with live inventory and order activity.
                  </Typography>
                  <Stack spacing={1.5}>
                    {[
                      { label: 'Orders synced', value: `${orders.length} live`, color: 'success' },
                      { label: 'Partner network', value: `${agents.length} agents`, color: 'primary' },
                      { label: 'Distribution reach', value: `${shops.length} shops`, color: 'secondary' },
                    ].map((item) => (
                      <Paper key={item.label} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{item.label}</Typography>
                          <Typography variant="subtitle2" color={`${item.color}.main`}>
                            {item.value}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : activeView === 'orders' ? (
          <OrdersPanel agents={agents} initialAgentId={agents[0]?.AgentId || ''} />
        ) : activeView === 'agents' ? (
          <AgentsPanel />
        ) : activeView === 'items' ? (
          <ItemsPanel />
        ) : activeView === 'reports' ? (
          <ReportsPanel />
        ) : (
          <ShopsPanel />
        )}
      </Container>
    </Box>
  );
}

export default App;

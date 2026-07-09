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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  riceSummary: `${apiBase}/api/ricesummary`,
  brandSummary: `${apiBase}/api/brandsummary`,
  agentSummary: `${apiBase}/api/agentSummary`,
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function App() {
  const [agents, setAgents] = useState([]);
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [riceSummary, setRiceSummary] = useState([]);
  const [brandSummary, setBrandSummary] = useState([]);
  const [agentSummary, setAgentSummary] = useState([]);
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
        const [agentsResponse, shopsResponse, itemsResponse, ordersResponse, riceSummaryResponse, brandSummaryResponse, agentSummaryResponse] = await Promise.all([
          fetch(api.agents, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.shops, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.items, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.orders, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.riceSummary, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.brandSummary, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(api.agentSummary, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);

        const [agentsData, shopsData, itemsData, ordersData, riceSummaryData, brandSummaryData, agentSummaryData] = await Promise.all([
          agentsResponse.json(),
          shopsResponse.json(),
          itemsResponse.json(),
          ordersResponse.json(),
          riceSummaryResponse.json(),
          brandSummaryResponse.json(),
          agentSummaryResponse.json()
        ]);

        setAgents(agentsData || []);
        setShops(shopsData || []);
        setItems(itemsData || []);
        setOrders(ordersData || []);
        setRiceSummary(riceSummaryData || []);
        setBrandSummary(brandSummaryData || []);
        setAgentSummary(agentSummaryData || []);
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

  const totalQuintals = riceSummary.reduce(
    (sum, row) => sum + Number(row.Quintals || 0),
    0
  );

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
        {activeView === 'overview' ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={6}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 8,
                  },
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    px: 3,
                    py: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Item Order Summary
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Aggregated pending order quantities
                  </Typography>
                </Box>

                <CardContent sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">

                      <TableHead>
                        <TableRow
                          sx={{
                            bgcolor: "grey.100",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>
                            Item
                          </TableCell>

                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700 }}
                          >
                            Qtls
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {riceSummary.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              align="center"
                              sx={{
                                py: 5,
                                color: "text.secondary",
                              }}
                            >
                              No pending orders
                            </TableCell>
                          </TableRow>
                        ) : (
                          riceSummary.map((row, index) => (
                            <TableRow
                              key={index}
                              hover
                              sx={{
                                bgcolor:
                                  index % 2 === 0
                                    ? "background.default"
                                    : "grey.50",
                              }}
                            >
                              <TableCell sx={{ fontWeight: 500 }}>
                                {row.ItemName}
                              </TableCell>

                              <TableCell
                                align="right"
                                sx={{
                                  fontWeight: "bold",
                                  color: "primary.main",
                                  fontSize: "1rem",
                                }}
                              >
                                {formatNumber(row.Quintals)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        <TableRow
                          sx={{
                            "& td": {
                              color: "green",
                              fontWeight: "bold",
                              fontSize: "1rem",
                            },
                          }}
                        >
                          <TableCell>Total</TableCell>
                          <TableCell align="right">
                            {formatNumber(totalQuintals)}
                          </TableCell>
                        </TableRow>
                      </TableBody>

                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
             <Grid item xs={12} md={6}>
              <Card
                elevation={6}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 8,
                  },
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    px: 3,
                    py: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Item Order Summary
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Aggregated pending order quantities
                  </Typography>
                </Box>

                <CardContent sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">

                      <TableHead>
                        <TableRow
                          sx={{
                            bgcolor: "grey.100",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>
                            Item
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            Brand
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700 }}
                          >
                            Bags
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700 }}
                          >
                            Kgs
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700 }}
                          >
                            Qtls
                          </TableCell>
                        </TableRow>
                      </TableHead>

                     <TableBody>

                      {brandSummary.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={5} align="center">
                                  No pending orders
                              </TableCell>
                          </TableRow>
                      ) : (

                          brandSummary.map(item =>

                              item.brands.map((brand, index) => (

                                  <TableRow key={`${item.RiceId}-${index}`} hover>

                                      {index === 0 && (
                                          <TableCell
                                              rowSpan={item.brands.length}
                                              sx={{
                                                  fontWeight: "bold",
                                                  verticalAlign: "top",
                                                  bgcolor: "grey.100"
                                              }}
                                          >
                                              <Typography variant="subtitle2" fontWeight="bold">
                                                {item.ItemName}
                                              </Typography>

                                              <Typography
                                                variant="caption"
                                                color="primary.main"
                                                fontWeight="bold"
                                              >
                                                Total: {formatNumber(item.Quintals)} Qtls
                                              </Typography>
  
                                          </TableCell>
                                      )}

                                      <TableCell>{brand.BrandName}</TableCell>
                                      <TableCell align="right">
                                          {brand.Bags}
                                      </TableCell>

                                      <TableCell align="right">
                                          {brand.Kgs}
                                      </TableCell>

                                      <TableCell align="right">
                                          {formatNumber(brand.Quintals)}
                                      </TableCell>

                                  </TableRow>

                              ))

                          )

                      )}

                      <TableRow
                          sx={{
                              "& td": {
                                  fontWeight: "bold",
                                  color: "green"
                              }
                          }}
                      >
                          <TableCell colSpan={4}>Total</TableCell>
                          <TableCell align="right">
                              {formatNumber(totalQuintals)}
                          </TableCell>
                      </TableRow>

                      </TableBody>

                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card
                elevation={6}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 8,
                  },
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    px: 3,
                    py: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Agent Order Summary
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Pending Orders by Agent
                  </Typography>
                </Box>

                <CardContent sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">

                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                          <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Rice</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Bags</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Kgs</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Qtls</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>

                        {agentSummary.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No pending orders {agentSummary.length}
                            </TableCell>
                          </TableRow>
                        ) : (

                          agentSummary.map(agent => {

                            const agentRows = agent.rice.reduce(
                              (sum, rice) => sum + rice.brands.length,
                              0
                            );

                            let agentRendered = false;

                            return agent.rice.map(rice => {

                              let riceRendered = false;

                              return rice.brands.map((brand, index) => (

                                <TableRow
                                  key={`${agent.agentId}-${rice.riceId}-${brand.brandId}`}
                                  hover
                                >

                                  {!agentRendered && (
                                    <TableCell
                                      rowSpan={agentRows}
                                      sx={{
                                        bgcolor: "grey.100",
                                        verticalAlign: "top",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      <Typography fontWeight="bold">
                                        {agent.agentName}
                                      </Typography>

                                      <Typography
                                        variant="caption"
                                        color="primary.main"
                                        fontWeight="bold"
                                      >
                                        Total : {formatNumber(agent.quintals)} Qtls
                                      </Typography>
                                    </TableCell>
                                  )}

                                  {!riceRendered && (
                                    <TableCell
                                      rowSpan={rice.brands.length}
                                      sx={{
                                        bgcolor: "grey.50",
                                        verticalAlign: "top",
                                      }}
                                    >
                                      <Typography fontWeight="bold">
                                        {rice.riceType}
                                      </Typography>

                                      <Typography
                                        variant="caption"
                                        color="secondary.main"
                                      >
                                        {formatNumber(rice.quintals)} Qtls
                                      </Typography>
                                    </TableCell>
                                  )}

                                  <TableCell>{brand.brandName}</TableCell>

                                  <TableCell align="right">
                                    {brand.bags}
                                  </TableCell>

                                  <TableCell align="right">
                                    {brand.kgs}
                                  </TableCell>

                                  <TableCell align="right">
                                    {formatNumber(brand.quintals)}
                                  </TableCell>

                                  {(() => {
                                    agentRendered = true;
                                    riceRendered = true;
                                    return null;
                                  })()}

                                </TableRow>

                              ));

                            });

                          })

                        )}

                        <TableRow
                          sx={{
                            "& td": {
                              fontWeight: "bold",
                              color: "green",
                            },
                          }}
                        >
                          <TableCell colSpan={5}>
                            Grand Total
                          </TableCell>

                          <TableCell align="right">
                            {formatNumber(
                              agentSummary.reduce(
                                (sum, a) => sum + a.quintals,
                                0
                              )
                            )}
                          </TableCell>
                        </TableRow>

                      </TableBody>

                    </Table>
                  </TableContainer>
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

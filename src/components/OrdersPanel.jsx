import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DataTable from './DataTable';
import OrderItemsManager from './OrderItemsManager';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function OrdersPanel({ agents = [], initialAgentId = '' }) {
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId || agents[0]?.AgentId || '');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderDate, setOrderDate] = useState(getTodayString());
  const [searchValue, setSearchValue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryOrderId, setDeliveryOrderId] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(getTodayString());
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [createShopDialogOpen, setCreateShopDialogOpen] = useState(false);
  const [shopForm, setShopForm] = useState({ ShopName: '', Place: '', Address: '', PhoneNumber: '', GST: '', AgentId: '' });
  const [shopsLoading, setShopsLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const apiBase = 'http://localhost:3000';

  const loadOrders = async (agentId = selectedAgentId) => {
    if (!agentId) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/orders/${agentId}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load orders', error);
      setSnackbar({ open: true, message: 'Unable to load orders right now.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async (agentId) => {
    if (!agentId) {
      setShops([]);
      setSelectedShop(null);
      return;
    }

    setShopsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/agents/${agentId}/shops`, { headers: getAuthHeaders() });
      const data = await response.json();
      setShops(Array.isArray(data) ? data : []);
      setSelectedShop(null);
    } catch (error) {
      console.error('Failed to load shops', error);
    } finally {
      setShopsLoading(false);
    }
  };

  useEffect(() => {
    if (agents.length && !selectedAgentId) {
      setSelectedAgentId(agents[0].AgentId);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (selectedAgentId) {
      loadShops(selectedAgentId);
      loadOrders(selectedAgentId);
    }
  }, [selectedAgentId]);

  const selectedAgentOption = useMemo(
    () => agents.find((agent) => String(agent.AgentId) === String(selectedAgentId)) || null,
    [agents, selectedAgentId]
  );

  const filteredOrders = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const haystack = `${order.ShopName || ''} ${order.Place || ''} ${order.Items || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, searchValue]);

  const openCreateShopDialog = () => {
    setShopForm({ ShopName: '', Place: '', Address: '', PhoneNumber: '', GST: '', AgentId: selectedAgentId });
    setCreateShopDialogOpen(true);
  };

  const handleCreateShop = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiBase}/api/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(shopForm),
      });
      if (!response.ok) throw new Error('Unable to create shop.');
      await loadShops(selectedAgentId);
      setCreateShopDialogOpen(false);
      setSnackbar({ open: true, message: 'Shop created successfully.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedAgentId || !selectedShop?.ShopId) {
      setSnackbar({ open: true, message: 'Please choose an agent and a shop.', severity: 'warning' });
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          Date: orderDate,
          AgentId: selectedAgentId,
          ShopId: selectedShop.ShopId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to add order.');
      }

      setSelectedShop(null);
      setOrderDate(getTodayString());
      await loadOrders(selectedAgentId);
      setSnackbar({ open: true, message: 'Order added successfully.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this order and its items?')) return;

    try {
      const response = await fetch(`${apiBase}/api/orders/${orderId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Unable to delete order.');
      await loadOrders(selectedAgentId);
      setSnackbar({ open: true, message: 'Order removed.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const openItemsDialog = (order) => {
    setSelectedOrder(order);
    setItemsDialogOpen(true);
  };

  const openDeliveryDialog = (orderId) => {
    setDeliveryOrderId(orderId);
    setDeliveryDate(getTodayString());
    setDeliveryDialogOpen(true);
  };

  const handleDeliveryUpdate = async () => {
    if (!deliveryOrderId) return;

    try {
      const response = await fetch(`${apiBase}/api/orders/${deliveryOrderId}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ DeliveryDate: deliveryDate }),
      });
      if (!response.ok) throw new Error('Unable to update delivery date.');
      await loadOrders(selectedAgentId);
      setDeliveryDialogOpen(false);
      setSnackbar({ open: true, message: 'Delivery date updated.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const tableRows = filteredOrders.map((order, index) => ({
    id: order.OrderId || index,
    order: `${order.OrderId || '—'} • ${formatDate(order.Date)}`,
    shop: `${order.ShopName || '—'}${order.Place ? ` • ${order.Place}` : ''}`,
    quintals: order.TotalQuintals || '0',
    items: order.Items || '—',
    actions: (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" color="primary" onClick={() => openItemsDialog(order)}>
          Manage items
        </Button>
        <Button size="small" variant="outlined" color="primary" onClick={() => openDeliveryDialog(order.OrderId)}>
          <LocalShippingRoundedIcon fontSize="small" />
        </Button>
        <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(order.OrderId)}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </Button>
      </Stack>
    ),
  }));

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }}>
            <Box>
              <Typography variant="h5">Order management</Typography>
              <Typography variant="body2" color="text.secondary">
                Create and track orders quickly for each agent and shop.
              </Typography>
            </Box>
            <Chip label={`${orders.length} active orders`} color="primary" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={agents}
                  value={selectedAgentOption}
                  getOptionLabel={(option) => option?.AgentName || ''}
                  isOptionEqualToValue={(option, value) => String(option.AgentId) === String(value?.AgentId)}
                  onChange={(_, value) => setSelectedAgentId(value?.AgentId || '')}
                  renderInput={(params) => <TextField {...params} label="Agent" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Order Date"
                  type="date"
                  fullWidth
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  {shopsLoading ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Loading shops for this agent...
                    </Alert>
                  ) : shops.length === 0 ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      No shops found for this agent yet.
                    </Alert>
                  ) : (
                    <Autocomplete
                      options={shops}
                      value={selectedShop}
                      getOptionLabel={(option) => `${option.ShopName || ''} • ${option.Place || ''}`}
                      isOptionEqualToValue={(option, value) => option.ShopId === value.ShopId}
                      onChange={(_, value) => setSelectedShop(value)}
                      renderInput={(params) => <TextField {...params} label="Select Shop" />}
                    />
                  )}
                  <Button variant="outlined" color="primary" onClick={openCreateShopDialog}>
                    {shops.length === 0 ? 'Create first shop' : 'Add shop'}
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button type="submit" variant="contained" fullWidth sx={{ height: 56 }} startIcon={<AddCircleOutlineRoundedIcon />}>
                  Add order
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <TextField
          label="Search orders"
          placeholder="Search by shop or item"
          fullWidth
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          sx={{ mb: 2 }}
        />

        <DataTable
          title="Orders" 
          subtitle={loading ? 'Loading orders…' : 'Track daily operations and delivery updates'}
          rows={tableRows}
          columns={[
            { key: 'order', label: 'Order' },
            { key: 'shop', label: 'Shop' },
            { key: 'quintals', label: 'Quintals' },
            { key: 'items', label: 'Items' },
            { key: 'actions', label: 'Actions' },
          ]}
        />
      </Box>

      <OrderItemsManager
        order={selectedOrder}
        open={itemsDialogOpen}
        onClose={() => setItemsDialogOpen(false)}
        onRefresh={() => loadOrders(selectedAgentId)}
      />

      <Dialog open={createShopDialogOpen} onClose={() => setCreateShopDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create shop</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleCreateShop} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Shop name" fullWidth required value={shopForm.ShopName} onChange={(event) => setShopForm((prev) => ({ ...prev, ShopName: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Place" fullWidth value={shopForm.Place} onChange={(event) => setShopForm((prev) => ({ ...prev, Place: event.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" fullWidth value={shopForm.Address} onChange={(event) => setShopForm((prev) => ({ ...prev, Address: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Phone number" fullWidth value={shopForm.PhoneNumber} onChange={(event) => setShopForm((prev) => ({ ...prev, PhoneNumber: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="GST" fullWidth value={shopForm.GST} onChange={(event) => setShopForm((prev) => ({ ...prev, GST: event.target.value }))} />
              </Grid>
            </Grid>
            <DialogActions sx={{ px: 0, pt: 2 }}>
              <Button onClick={() => setCreateShopDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save shop</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)}>
        <DialogTitle>Set delivery date</DialogTitle>
        <DialogContent>
          <TextField
            label="Delivery date"
            type="date"
            fullWidth
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeliveryUpdate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default OrdersPanel;

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DeliveredOrdersPanel() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [actionError, setActionError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const openEditDialog = (order) => {
    setEditOrder(order);
    setEditDate(selectedDate);
    setActionError('');
    setEditDialogOpen(true);
  };

  const handleUpdateDeliveryDate = async () => {
    if (!editOrder?.OrderId || !editDate) return;

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${editOrder.OrderId}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ DeliveryDate: editDate }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to update delivery date.');
      setEditDialogOpen(false);
      setSelectedDate(editDate);
    } catch (updateError) {
      setActionError(updateError.message || 'Unable to update delivery date.');
    }
  };

  const handleClearDeliveryDate = async (order) => {
    if (!window.confirm(`Mark order #${order.OrderId} as not delivered?`)) return;

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${order.OrderId}/delivery`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to clear delivery date.');
      setOrders((currentOrders) => currentOrders.filter((row) => String(row.OrderId) !== String(order.OrderId)));
    } catch (clearError) {
      setError(clearError.message || 'Unable to clear delivery date.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadDeliveredOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`http://localhost:3000/api/reports/daily-report/${selectedDate}`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load delivered orders.');
        if (!cancelled) setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (loadError) {
        if (!cancelled) {
          setOrders([]);
          setError(loadError.message || 'Unable to load delivered orders.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDeliveredOrders();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const totals = useMemo(
    () => orders.reduce((summary, row) => ({
      bags: summary.bags + Number(row.Bags || 0),
      kgs: summary.kgs + Number(row.Kgs || 0),
      quintals: summary.quintals + Number(row.Quintals || 0),
      amount: summary.amount + Number(row.Amount || 0),
    }), { bags: 0, kgs: 0, quintals: 0, amount: 0 }),
    [orders]
  );

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5">Delivered orders</Typography>
              <Typography variant="body2" color="text.secondary">
                Review orders delivered on a selected date.
              </Typography>
            </Box>
            <TextField
              label="Delivery date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">Delivery details</Typography>
              <Typography variant="body2" color="text.secondary">{selectedDate}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">{orders.length} item records</Typography>
          </Stack>

          {loading ? (
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 5 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading delivered orders...</Typography>
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Order / Shop</TableCell>
                    <TableCell>Item &amp; Brand</TableCell>
                    <TableCell align="right">Bags</TableCell>
                    <TableCell align="right">Kgs</TableCell>
                    <TableCell align="right">Qtls</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No delivered orders found for this date.
                      </TableCell>
                    </TableRow>
                  ) : orders.map((row, index) => (
                    <TableRow key={`${row.OrderId}-${row.ItemName}-${row.Brand}-${index}`} hover>
                      <TableCell>{row.AgentName || '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ fontWeight: 600 }}>#{row.OrderId || '—'}</Box>
                        <Box component="span">{row.ShopName || '—'}{row.Place ? ` • ${row.Place}` : ''}</Box>
                      </TableCell>
                      <TableCell>{row.ItemName || '—'} • {row.Brand || '—'}</TableCell>
                      <TableCell align="right">{row.Bags || 0}</TableCell>
                      <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Rate)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Amount)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Change delivery date">
                            <IconButton size="small" color="primary" onClick={() => openEditDialog(row)} aria-label={`Change delivery date for order ${row.OrderId}`}>
                              <EditCalendarRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mark as not delivered">
                            <IconButton size="small" color="error" onClick={() => handleClearDeliveryDate(row)} aria-label={`Mark order ${row.OrderId} as not delivered`}>
                              <EventBusyRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length > 0 ? (
                    <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.bags}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(totals.kgs)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(totals.quintals)}</TableCell>
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(totals.amount)}</TableCell>
                      <TableCell />
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change delivery date</DialogTitle>
        <DialogContent>
          {actionError ? <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert> : null}
          <TextField
            label="Delivery date"
            type="date"
            fullWidth
            value={editDate}
            onChange={(event) => setEditDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateDeliveryDate} disabled={!editDate}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DeliveredOrdersPanel;
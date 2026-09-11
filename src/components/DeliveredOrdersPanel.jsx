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
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
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

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function DeliveredOrdersPanel() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [orders, setOrders] = useState([]);
  const [searchText, setSearchText] = useState('');
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

  const changeSelectedDate = (days) => {
    setSelectedDate((currentDate) => shiftDate(currentDate, days));
  };

  const changeEditDate = (days) => {
    setEditDate((currentDate) => shiftDate(currentDate, days));
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

  const filteredOrders = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase();
    if (!search) return orders;

    return orders.filter((row) => [row.AgentName, row.ShopName]
      .some((value) => String(value || '').toLocaleLowerCase().includes(search)));
  }, [orders, searchText]);

  const groupedOrders = useMemo(() => {
    const agentMap = new Map();

    filteredOrders.forEach((row) => {
      const agentKey = String(row.AgentId ?? row.AgentName ?? 'Unknown');
      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, {
          agentName: row.AgentName || '—',
          orders: new Map(),
        });
      }

      const agentEntry = agentMap.get(agentKey);
      const orderKey = `${row.OrderId ?? '—'}|${row.ShopName ?? '—'}|${row.Place ?? '—'}`;
      if (!agentEntry.orders.has(orderKey)) {
        agentEntry.orders.set(orderKey, {
          orderId: row.OrderId || '—',
          shopName: row.ShopName || '—',
          place: row.Place || '—',
          items: [],
        });
      }

      agentEntry.orders.get(orderKey).items.push(row);
    });

    const groupedRows = [];
    agentMap.forEach((agentEntry) => {
      const orderGroups = Array.from(agentEntry.orders.values());
      const agentRowSpan = orderGroups.reduce((total, order) => total + order.items.length, 0);

      orderGroups.forEach((order, orderIndex) => {
        order.items.forEach((item, itemIndex) => {
          groupedRows.push({
            ...item,
            agentName: agentEntry.agentName,
            showAgent: orderIndex === 0 && itemIndex === 0,
            agentRowSpan,
            showOrder: itemIndex === 0,
            orderRowSpan: order.items.length,
          });
        });
      });
    });

    return groupedRows;
  }, [filteredOrders]);

  const totals = useMemo(
    () => filteredOrders.reduce((summary, row) => ({
      bags: summary.bags + Number(row.Bags || 0),
      kgs: summary.kgs + Number(row.Kgs || 0),
      quintals: summary.quintals + Number(row.Quintals || 0),
      amount: summary.amount + Number(row.Amount || 0),
    }), { bags: 0, kgs: 0, quintals: 0, amount: 0 }),
    [filteredOrders]
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
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Tooltip title="Previous day">
                <IconButton onClick={() => changeSelectedDate(-1)} aria-label="Previous day">
                  <ChevronLeftRoundedIcon />
                </IconButton>
              </Tooltip>
              <TextField
                label="Delivery date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: { xs: 0, md: 220 } }}
              />
              <Tooltip title="Next day">
                <IconButton onClick={() => changeSelectedDate(1)} aria-label="Next day">
                  <ChevronRightRoundedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <TextField
                size="small"
                label="Search agent or shop"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 240 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {filteredOrders.length} item records
              </Typography>
            </Stack>
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
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {orders.length === 0 ? 'No delivered orders found for this date.' : 'No orders match the search.'}
                      </TableCell>
                    </TableRow>
                  ) : groupedOrders.map((row, index) => (
                    <TableRow key={`${row.OrderId}-${row.ItemName}-${row.Brand}-${index}`} hover>
                      {row.showAgent ? (
                        <TableCell rowSpan={row.agentRowSpan} sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                          {row.agentName}
                        </TableCell>
                      ) : null}
                      {row.showOrder ? (
                        <TableCell rowSpan={row.orderRowSpan} sx={{ verticalAlign: 'top' }}>
                          <Box sx={{ fontWeight: 600 }}>#{row.OrderId || '—'}</Box>
                          <Box component="span">{row.ShopName || '—'}{row.Place ? ` • ${row.Place}` : ''}</Box>
                        </TableCell>
                      ) : null}
                      <TableCell>{row.ItemName || '—'} • {row.Brand || '—'}</TableCell>
                      <TableCell align="right">{row.Bags || 0}</TableCell>
                      <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Rate)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Amount)}</TableCell>
                      {row.showOrder ? (
                        <TableCell rowSpan={row.orderRowSpan} align="center" sx={{ verticalAlign: 'top' }}>
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
                      ) : null}
                    </TableRow>
                  ))}
                  {filteredOrders.length > 0 ? (
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
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <Tooltip title="Previous day">
              <IconButton onClick={() => changeEditDate(-1)} aria-label="Previous day">
                <ChevronLeftRoundedIcon />
              </IconButton>
            </Tooltip>
            <TextField
              label="Delivery date"
              type="date"
              fullWidth
              value={editDate}
              onChange={(event) => setEditDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Tooltip title="Next day">
              <IconButton onClick={() => changeEditDate(1)} aria-label="Next day">
                <ChevronRightRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
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
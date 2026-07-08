import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

const defaultStatuses = [
  { StatusId: 1, Status: 'Pending' },
  { StatusId: 2, Status: 'In Progress' },
  { StatusId: 3, Status: 'Completed' },
];

function OrderItemsManager({ order, open, onClose, onRefresh }) {
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bags, setBags] = useState('');
  const [kgs, setKgs] = useState('26');
  const [rate, setRate] = useState('');
  const [condition, setCondition] = useState('100');
  const [statusId, setStatusId] = useState('1');
  const [notes, setNotes] = useState('');
  const [editItemId, setEditItemId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const apiBase = 'http://localhost:3000';

  const loadCatalog = async () => {
    try {
      const response = await fetch(`${apiBase}/api/items`, { headers: getAuthHeaders() });
      const data = await response.json();
      const formatted = (Array.isArray(data) ? data : []).map((item) => ({
        id: item.ItemId,
        label: `${item.Name || ''}${item.Brand ? ` ${item.Brand}` : ''}`.trim(),
      }));
      setCatalog(formatted);
    } catch (error) {
      console.error('Unable to load catalog', error);
      setCatalog([]);
    }
  };

  const loadStatuses = async () => {
    try {
      const response = await fetch(`${apiBase}/api/Status`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Status endpoint unavailable');
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        setStatuses(data);
      }
    } catch (error) {
      setStatuses(defaultStatuses);
    }
  };

  const loadItems = async () => {
    if (!order?.OrderId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/OrderItem`, { headers: getAuthHeaders() });
      const data = await response.json();
      const orderItems = (Array.isArray(data) ? data : []).filter((item) => String(item.OrderId) === String(order.OrderId));
      setItems(orderItems);
    } catch (error) {
      console.error('Unable to load order items', error);
      setSnackbar({ open: true, message: 'Unable to load order items.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCatalog();
      loadStatuses();
      loadItems();
    }
  }, [open, order?.OrderId]);

  const itemLookup = useMemo(() => {
    return catalog.reduce((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {});
  }, [catalog]);

  const resetForm = () => {
    setSelectedItem(null);
    setBags('');
    setKgs('26');
    setRate('');
    setCondition('100');
    setStatusId('1');
    setNotes('');
    setEditItemId(null);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!order?.OrderId || !selectedItem?.id) {
      setSnackbar({ open: true, message: 'Select an item before saving.', severity: 'warning' });
      return;
    }

    const payload = {
      ItemId: selectedItem.id,
      Bags: Number(bags || 0),
      Kgs: Number(kgs || 26),
      Rate: Number(rate || 0),
      Condition: Number(condition || 100),
      StatusId: Number(statusId || 1),
      Notes: notes,
    };

    try {
      const response = editItemId
        ? await fetch(`/orders/${order.OrderId}/items/edit/${editItemId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(payload),
          })
        : await fetch(`/orders/${order.OrderId}/items/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(payload),
          });

      const data = await response.json();
      if (!response.ok || data?.success === false || data?.error) {
        throw new Error(data?.error || 'Unable to save the order item.');
      }

      await loadItems();
      if (onRefresh) onRefresh();
      resetForm();
      setSnackbar({ open: true, message: editItemId ? 'Item updated.' : 'Item added.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditItemId(item.OrderItemId);
    const matchingItem = catalog.find((catalogItem) => String(catalogItem.id) === String(item.ItemId));
    setSelectedItem(matchingItem || null);
    setBags(item.Bags || '');
    setKgs(item.Kgs || '26');
    setRate(item.Rate || '');
    setCondition(String(item.Condition ?? '100'));
    setStatusId(String(item.StatusId || 1));
    setNotes(item.Notes || '');
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this order item?')) return;

    try {
      const response = await fetch(`/orders/${order.OrderId}/items/delete/${item.OrderItemId}`, { method: 'POST', headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok || data?.success === false) throw new Error('Unable to delete the item.');
      await loadItems();
      if (onRefresh) onRefresh();
      setSnackbar({ open: true, message: 'Item deleted.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">Order items</Typography>
              <Typography variant="body2" color="text.secondary">
                {order ? `Order #${order.OrderId} • ${order.ShopName || 'Shop'}` : 'Select an order'}
              </Typography>
            </Box>
            <Chip label={`${items.length} item${items.length === 1 ? '' : 's'}`} color="primary" variant="outlined" />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={catalog}
                  value={selectedItem}
                  getOptionLabel={(option) => option?.label || ''}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                  onChange={(_, value) => setSelectedItem(value)}
                  renderInput={(params) => <TextField {...params} label="Item" required />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Bags" type="number" fullWidth value={bags} onChange={(event) => setBags(event.target.value)} required />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Kgs" type="number" fullWidth value={kgs} onChange={(event) => setKgs(event.target.value)} required />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Rate" type="number" fullWidth value={rate} onChange={(event) => setRate(event.target.value)} required />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Condition"
                  type="number"
                  fullWidth
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Status" select fullWidth value={statusId} onChange={(event) => setStatusId(event.target.value)}>
                  {statuses.map((status) => (
                    <MenuItem key={status.StatusId} value={status.StatusId}>
                      {status.Status}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Notes" fullWidth value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" startIcon={<AddCircleOutlineRoundedIcon />}>
                {editItemId ? 'Update item' : 'Add item'}
              </Button>
              <Button variant="outlined" onClick={resetForm}>
                Clear
              </Button>
            </Stack>
          </Box>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Current items
          </Typography>

          {loading ? (
            <Typography color="text.secondary">Loading items…</Typography>
          ) : items.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No items have been added to this order yet.
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Paper key={item.OrderItemId} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle2">{itemLookup[item.ItemId] || `Item #${item.ItemId}`}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bags: {item.Bags} • Kgs: {item.Kgs} • Rate: {item.Rate}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Condition: {item.Condition || 'Good'} • Notes: {item.Notes || '—'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDelete(item)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
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
    </>
  );
}

export default OrderItemsManager;

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';

const apiBase = 'http://localhost:3000';
const tabs = [
  { key: 'items', label: 'Items' },
  { key: 'rices', label: 'Rice' },
  { key: 'brands', label: 'Brands' },
];
const riceCategories = [
  { id: '1', label: '1 - Rice' },
  { id: '2', label: '2 - Brokens' },
  { id: '3', label: '3 - By Products' },
];

function ItemsPanel() {
  const [items, setItems] = useState([]);
  const [rices, setRices] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeTab, setActiveTab] = useState('items');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const readResponse = async (response, fallback) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch(`${apiBase}/api/items`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/api/rices`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/api/brands`, { headers: getAuthHeaders() }),
      ]);
      const [itemsData, ricesData, brandsData] = await Promise.all([
        readResponse(responses[0], 'Unable to load items.'),
        readResponse(responses[1], 'Unable to load rice types.'),
        readResponse(responses[2], 'Unable to load brands.'),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setRices(Array.isArray(ricesData) ? ricesData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Unable to load the catalog.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item.Name || ''} ${item.Brand || ''}`.toLowerCase().includes(query));
  }, [items, search]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    if (activeTab === 'items') {
      setForm({ RiceId: '', BrandId: '', IsActive: true });
    } else if (activeTab === 'rices') {
      const nextOrder = Math.max(0, ...rices.map((rice) => Number(rice.Odr) || 0)) + 1;
      setForm({ RiceType: '', Odr: String(nextOrder), TypeId: '1' });
    } else {
      setForm({ BrandName: '' });
    }
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    if (activeTab === 'items') {
      setForm({
        RiceId: String(record.RiceId || ''),
        BrandId: String(record.BrandId || ''),
        IsActive: Boolean(record.IsActive),
      });
    } else if (activeTab === 'rices') {
      setForm({
        RiceType: record.RiceType || '',
        Odr: String(record.Odr ?? ''),
        TypeId: String(record.TypeId ?? '1'),
      });
    } else {
      setForm({ BrandName: record.BrandName || '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const editing = Boolean(editingRecord);
    const id = editingRecord?.ItemId ?? editingRecord?.RiceId ?? editingRecord?.BrandId;
    const path = `/api/${activeTab}${editing ? `/${id}` : ''}`;
    const payload = activeTab === 'items'
      ? { RiceId: Number(form.RiceId), BrandId: Number(form.BrandId), IsActive: Boolean(form.IsActive) }
      : activeTab === 'rices'
        ? { RiceType: form.RiceType.trim(), Odr: Number(form.Odr), TypeId: Number(form.TypeId) }
        : { BrandName: form.BrandName.trim() };

    setSaving(true);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      await readResponse(response, `Unable to ${editing ? 'update' : 'create'} ${activeTab}.`);
      await loadData();
      setDialogOpen(false);
      setSnackbar({
        open: true,
        message: `${activeTab === 'items' ? 'Item' : activeTab === 'rices' ? 'Rice type' : 'Brand'} ${editing ? 'updated' : 'created'}.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const id = record.ItemId ?? record.RiceId ?? record.BrandId;
    const label = activeTab === 'items'
      ? `${record.Name || 'Rice'} ${record.Brand || 'Brand'}`
      : activeTab === 'rices' ? record.RiceType : record.BrandName;
    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      const response = await fetch(`${apiBase}/api/${activeTab}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await readResponse(response, `Unable to delete ${activeTab}.`);
      await loadData();
      setSnackbar({
        open: true,
        message: `${activeTab === 'items' ? 'Item' : activeTab === 'rices' ? 'Rice type' : 'Brand'} deleted.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleActiveChange = async (item, isActive) => {
    try {
      const response = await fetch(`${apiBase}/api/items/${item.ItemId}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ isActive }),
      });
      await readResponse(response, 'Unable to update item status.');
      await loadData();
      setSnackbar({ open: true, message: `Item ${isActive ? 'activated' : 'deactivated'}.`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const records = activeTab === 'items' ? filteredItems : activeTab === 'rices' ? rices : brands;
  const label = activeTab === 'items' ? 'item' : activeTab === 'rices' ? 'rice type' : 'brand';
  const recordId = (record) => record.ItemId ?? record.RiceId ?? record.BrandId;
  const recordName = (record) => activeTab === 'items'
    ? `${record.Name || 'Rice'} ${record.Brand || 'Brand'}`
    : activeTab === 'rices' ? record.RiceType : record.BrandName;
  const getRiceOrder = (record) => rices.find((rice) => String(rice.RiceId) === String(record.RiceId))?.Odr ?? '—';
  const getBrandOrder = (record) => brands.find((brand) => String(brand.BrandId) === String(record.BrandId))?.Odr ?? '—';

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5">Catalog management</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage rice types and brands, then combine them to define order items.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openCreateDialog}>
              Add {label}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
              setSearch('');
            }}
            aria-label="Catalog entities"
            sx={{ mb: 2 }}
          >
            {tabs.map((tab) => <Tab key={tab.key} value={tab.key} label={tab.label} />)}
          </Tabs>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
            {activeTab === 'items' ? (
              <TextField label="Search items" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { md: 320 } }} />
            ) : <Box />}
            <Chip
              label={`${records.length} ${activeTab === 'items' ? 'items' : activeTab === 'rices' ? 'rice types' : 'brands'}`}
              color="primary"
              variant="outlined"
            />
          </Stack>

          {loading ? (
            <Alert severity="info">Loading catalog…</Alert>
          ) : records.length === 0 ? (
            <Alert severity="info">No {activeTab === 'items' ? 'items' : activeTab === 'rices' ? 'rice types' : 'brands'} found.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {records.map((record) => (
                <Card key={recordId(record)} variant="outlined">
                  <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.5 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
                      <Box>
                        <Typography variant="subtitle1">{recordName(record)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activeTab === 'items'
                            ? `Item ID: ${record.ItemId} • Rice order: ${getRiceOrder(record)} • Brand order: ${getBrandOrder(record)}`
                            : activeTab === 'rices'
                              ? `Rice ID: ${record.RiceId} • Order: ${record.Odr ?? '—'} • Type: ${riceCategories.find((category) => category.id === String(record.TypeId))?.label || '—'}`
                              : `Brand ID: ${record.BrandId}`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {activeTab === 'items' && (
                          <>
                            <Typography variant="body2" color={record.IsActive ? 'success.main' : 'text.secondary'}>
                              {record.IsActive ? 'Active' : 'Inactive'}
                            </Typography>
                            <Switch
                              checked={Boolean(record.IsActive)}
                              onChange={(event) => handleActiveChange(record, event.target.checked)}
                              inputProps={{ 'aria-label': `Set ${recordName(record)} ${record.IsActive ? 'inactive' : 'active'}` }}
                            />
                          </>
                        )}
                        <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(record)}>Edit</Button>
                        {!(
                          (activeTab === 'items' && Boolean(record.IsUsedInOrders)) ||
                          (activeTab === 'brands' && items.some((item) => String(item.BrandId) === String(record.BrandId))) ||
                          (activeTab === 'rices' && items.some((item) => String(item.RiceId) === String(record.RiceId)))
                        ) && (
                          <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDelete(record)}>Delete</Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? 'Edit' : 'Add'} {label}</DialogTitle>
        <DialogContent>
          <Box component="form" id="catalog-form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
            {activeTab === 'items' ? (
              <Stack spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel id="rice-select-label">Rice</InputLabel>
                  <Select
                    labelId="rice-select-label"
                    label="Rice"
                    value={form.RiceId || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, RiceId: event.target.value }))}
                  >
                    {rices.map((rice) => <MenuItem key={rice.RiceId} value={String(rice.RiceId)}>{rice.RiceType}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel id="brand-select-label">Brand</InputLabel>
                  <Select
                    labelId="brand-select-label"
                    label="Brand"
                    value={form.BrandId || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, BrandId: event.target.value }))}
                  >
                    {brands.map((brand) => <MenuItem key={brand.BrandId} value={String(brand.BrandId)}>{brand.BrandName}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={Boolean(form.IsActive)}
                    onChange={(event) => setForm((previous) => ({ ...previous, IsActive: event.target.checked }))}
                  />
                  <Typography>Active</Typography>
                </Stack>
                {(!rices.length || !brands.length) && (
                  <Alert severity="warning">Add at least one rice type and one brand before creating an item.</Alert>
                )}
              </Stack>
            ) : activeTab === 'rices' ? (
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  fullWidth
                  required
                  label="Rice type"
                  value={form.RiceType || ''}
                  onChange={(event) => setForm((previous) => ({ ...previous, RiceType: event.target.value }))}
                />
                <TextField
                  fullWidth
                  required
                  type="number"
                  inputProps={{ min: 1, step: 1 }}
                  label="Order"
                  value={form.Odr || ''}
                  onChange={(event) => setForm((previous) => ({ ...previous, Odr: event.target.value }))}
                />
                <FormControl fullWidth required>
                  <InputLabel id="rice-category-label">Type</InputLabel>
                  <Select
                    labelId="rice-category-label"
                    label="Type"
                    value={form.TypeId || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, TypeId: event.target.value }))}
                  >
                    {riceCategories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>{category.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            ) : (
              <TextField
                autoFocus
                fullWidth
                required
                label="Brand name"
                value={form.BrandName || ''}
                onChange={(event) => setForm((previous) => ({ ...previous, BrandName: event.target.value }))}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            type="submit"
            form="catalog-form"
            variant="contained"
            disabled={saving || (activeTab === 'items' && (!rices.length || !brands.length))}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ItemsPanel;

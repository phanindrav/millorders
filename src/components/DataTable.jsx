import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';

function DataTable({ title, subtitle, rows = [], columns = [] }) {
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;

    const column = columns.find((item) => item.key === sortConfig.key);
    if (!column?.sortable) return rows;

    return [...rows].sort((firstRow, secondRow) => {
      const firstValue = column.sortValue ? column.sortValue(firstRow) : firstRow[column.key];
      const secondValue = column.sortValue ? column.sortValue(secondRow) : secondRow[column.key];

      if (firstValue == null && secondValue == null) return 0;
      if (firstValue == null) return 1;
      if (secondValue == null) return -1;

      const firstText = String(firstValue).toLowerCase();
      const secondText = String(secondValue).toLowerCase();
      const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : firstText.localeCompare(secondText, undefined, { numeric: true });

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [columns, rows, sortConfig]);

  const handleSort = (column) => {
    if (!column.sortable) return;

    setSortConfig((current) => ({
      key: column.key,
      direction: current.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <Chip label={`${rows.length} records`} color="primary" variant="outlined" />
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} sortDirection={sortConfig.key === column.key ? sortConfig.direction : false}>
                    {column.sortable ? (
                      <TableSortLabel
                        active={sortConfig.key === column.key}
                        direction={sortConfig.key === column.key ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort(column)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No data available yet.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row, index) => (
                  <TableRow key={row.id || index} hover>
                    {columns.map((column) => (
                      <TableCell key={column.key}>{column.render ? column.render(row) : row[column.key]}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

export default DataTable;

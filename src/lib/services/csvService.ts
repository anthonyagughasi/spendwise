import Papa from 'papaparse';
import type { Transaction } from '@/src/types/finance';

function sanitizeCsvCell(value: string): string {
  const trimmed = value ?? '';
  // Guard against spreadsheet formula injection when opened in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  filenamePrefix = 'spendwise-transactions'
): number {
  const rows = transactions.map((tx) => ({
    'Transaction ID': tx.id,
    Title: sanitizeCsvCell(tx.title),
    Type: tx.type,
    Category: sanitizeCsvCell(tx.categoryName),
    Amount: tx.amount.toFixed(2),
    Currency: tx.currency,
    Date: tx.date,
    'Payment method': tx.paymentMethod,
    Description: sanitizeCsvCell(tx.description || ''),
  }));

  const csv = Papa.unparse(rows, {
    quotes: true,
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${stamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return rows.length;
}

import { downloadBlob, downloadBrowserFile } from './apiClient';

export async function downloadDocumentExport(documentId, type, token) {
  const blob = await downloadBlob(
    `/api/documents/${documentId}/export/${type}`,
    token,
    'Експортът не беше успешен.'
  );
  downloadBrowserFile(blob, type === 'excel' ? 'ocr-export.xlsx' : 'ocr-export.pdf');
}

export async function downloadMonthlyPdfReport(month, token) {
  const blob = await downloadBlob(
    `/api/reports/monthly/pdf?month=${month}`,
    token,
    'PDF отчетът не беше генериран.'
  );
  downloadBrowserFile(blob, `pdf-otchet-${month}.pdf`);
}


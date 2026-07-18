import { render, screen, waitFor } from '@testing-library/react';
import DocumentPreview from './DocumentPreview';
import { getDocumentFile } from '../services/documentService';

jest.mock('../services/documentService', () => ({
  getDocumentFile: jest.fn()
}));

beforeEach(() => {
  getDocumentFile.mockReset();
  window.URL.createObjectURL = jest.fn(() => 'blob:preview-url');
  window.URL.revokeObjectURL = jest.fn();
});

test('does not request a source document without document id or token', () => {
  render(<DocumentPreview result={{ id: 'doc-1' }} token="" />);

  expect(getDocumentFile).not.toHaveBeenCalled();
});

test('loads protected document preview and revokes object URL on unmount', async () => {
  getDocumentFile.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));

  const { unmount } = render(
    <DocumentPreview result={{ id: 'doc-1', mime_type: 'image/png' }} token="token-1" />
  );

  await waitFor(() => expect(getDocumentFile).toHaveBeenCalledWith('doc-1', 'token-1'));
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:preview-url');

  unmount();

  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-url');
});

test('shows safe preview error when protected file loading fails', async () => {
  getDocumentFile.mockRejectedValue(new Error('Access denied'));

  render(<DocumentPreview result={{ id: 'doc-1', mime_type: 'image/png' }} token="token-1" />);

  expect(await screen.findByText('Access denied')).toBeInTheDocument();
  expect(window.URL.createObjectURL).not.toHaveBeenCalled();
});

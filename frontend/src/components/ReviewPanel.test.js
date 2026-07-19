import { render, screen } from '@testing-library/react';
import ReviewPanel from './ReviewPanel';

jest.mock('./DocumentPreview', () => () => <div data-testid="document-preview" />);

const draft = {
  issueDate: '2026-07-18',
  supplierName: 'Supplier',
  recipientName: 'Recipient',
  documentType: 'invoice',
  documentNumber: 'INV-1',
  totalAmount: 100,
  vatAmount: 20,
  currency: 'BGN',
  paymentMethod: 'bank_transfer',
  category: 'Office',
  netAmount: 80,
  needsReview: false,
  reviewReasons: [],
  warnings: []
};

test('disables review and approval actions while saving', () => {
  render(
    <ReviewPanel
      draft={draft}
      onApprove={jest.fn()}
      onSaveReview={jest.fn()}
      onUpdateDraft={jest.fn()}
      result={{ id: 'doc-1', status: 'needs_review' }}
      saving
      token="token-1"
    />
  );

  const buttons = screen.getAllByRole('button');

  expect(buttons).toHaveLength(2);
  expect(buttons[0]).toBeDisabled();
  expect(buttons[1]).toBeDisabled();
});

test('keeps review and approval actions available when not saving', () => {
  render(
    <ReviewPanel
      draft={draft}
      onApprove={jest.fn()}
      onSaveReview={jest.fn()}
      onUpdateDraft={jest.fn()}
      result={{ id: 'doc-1', status: 'needs_review' }}
      saving={false}
      token="token-1"
    />
  );

  const buttons = screen.getAllByRole('button');

  expect(buttons).toHaveLength(2);
  expect(buttons[0]).toBeEnabled();
  expect(buttons[1]).toBeEnabled();
});

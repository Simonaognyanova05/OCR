import { useCallback, useState } from 'react';
import { getDocument, listDocuments } from '../services/documentService';

export const initialDocumentFilters = {
  dateFrom: '',
  dateTo: '',
  supplier: '',
  recipient: '',
  amountMin: '',
  amountMax: '',
  currency: '',
  category: '',
  status: '',
  documentType: '',
};

export function useDocuments(auth, onError) {
  const [documents, setDocuments] = useState([]);
  const [documentFilters, setDocumentFilters] = useState(initialDocumentFilters);

  const loadDocuments = useCallback(async (filters = documentFilters) => {
    if (!auth?.token) return;

    try {
      const data = await listDocuments(filters, auth.token);
      setDocuments(data.documents || []);
    } catch (error) {
      onError(error.message);
    }
  }, [auth?.token, documentFilters, onError]);

  const openDocument = useCallback(async (documentId) => {
    if (!auth?.token) return null;

    try {
      return await getDocument(documentId, auth.token);
    } catch (error) {
      onError(error.message);
      return null;
    }
  }, [auth?.token, onError]);

  return {
    documentFilters,
    documents,
    loadDocuments,
    openDocument,
    setDocumentFilters,
  };
}


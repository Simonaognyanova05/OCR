import { useEffect, useState } from 'react';
import { getDocumentFile } from '../services/documentService';

function DocumentPreview({ result, token }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function loadPreview() {
      if (!result?.id || !token) {
        setPreviewUrl('');
        return;
      }

      setPreviewError('');

      try {
        const blob = await getDocumentFile(result.id, token);
        if (!active) return;

        objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        if (active) {
          setPreviewUrl('');
          setPreviewError(error.message);
        }
      }
    }

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [result?.id, token]);

  if (!result?.id) {
    return <p className="empty">Оригиналният документ ще се покаже тук след качване.</p>;
  }

  const isPdf = result.mime_type === 'application/pdf';

  if (previewError) {
    return <p className="empty">{previewError}</p>;
  }

  if (!previewUrl) {
    return <p className="empty">Зареждане на оригиналния документ...</p>;
  }

  return (
    <div className="document-preview">
      {isPdf ? (
        <iframe title="Оригинален документ" src={previewUrl} />
      ) : (
        <img src={previewUrl} alt="Оригинален документ" />
      )}
    </div>
  );
}

export default DocumentPreview;

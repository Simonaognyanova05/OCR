import { useEffect, useState } from 'react';
import { getContractFile } from '../services/contractService';
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
        const isContract = result.file_endpoint?.startsWith('/api/contracts/');
        const blob = isContract
          ? await getContractFile(result.id, token)
          : await getDocumentFile(result.id, token);
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
  }, [result?.id, result?.file_endpoint, token]);

  if (!result?.id) {
    return <p className="empty">Оригиналният документ ще се покаже тук след качване.</p>;
  }

  const isPdf = result.mime_type === 'application/pdf';
  const isPreviewableImage = result.mime_type?.startsWith('image/');

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
      ) : isPreviewableImage ? (
        <img src={previewUrl} alt="Оригинален документ" />
      ) : (
        <p className="empty">Прегледът е наличен за PDF и изображения. DOCX файлът е записан като защитен файл.</p>
      )}
    </div>
  );
}

export default DocumentPreview;

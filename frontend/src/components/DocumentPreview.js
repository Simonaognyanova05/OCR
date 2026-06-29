import { API_BASE_URL } from '../config/api';

function DocumentPreview({ result }) {
  if (!result?.file_url) {
    return <p className="empty">Оригиналният документ ще се покаже тук след качване.</p>;
  }

  const src = `${API_BASE_URL}${result.file_url}`;
  const isPdf = result.mime_type === 'application/pdf';

  return (
    <div className="document-preview">
      {isPdf ? (
        <iframe title="Оригинален документ" src={src} />
      ) : (
        <img src={src} alt="Оригинален документ" />
      )}
    </div>
  );
}

export default DocumentPreview;


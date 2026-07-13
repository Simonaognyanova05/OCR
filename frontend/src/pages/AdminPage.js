import { useEffect, useState } from 'react';
import {
  approveSubscriptionRequest,
  listSubscriptionRequests,
  rejectSubscriptionRequest,
} from '../services/adminService';

function AdminPage({ auth }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadRequests(nextStatus = status) {
    setLoading(true);
    setError('');

    try {
      const data = await listSubscriptionRequests(auth.token, nextStatus);
      setRequests(data.subscription_requests || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleApprove(id) {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await approveSubscriptionRequest(id, auth.token);
      setNotice('Заявката е одобрена и планът е активиран.');
      await loadRequests(status);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(id) {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await rejectSubscriptionRequest(id, auth.token);
      setNotice('Заявката е отказана.');
      await loadRequests(status);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Админ панел</p>
          <h2>Абонаментни заявки</h2>
          <p>Преглеждай заявките за планове и активирай абонамент след потвърдено плащане.</p>
        </div>
      </section>

      <section className="documents-panel">
        <div className="panel-heading">
          <div>
            <h2>Заявки</h2>
            <p className="panel-subtitle">Одобрението сменя активния план и месечния лимит на фирмата.</p>
          </div>
          <div className="panel-tools">
            <label className="field compact-field">
              <span>Статус</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="pending">Чакащи</option>
                <option value="approved">Одобрени</option>
                <option value="rejected">Отказани</option>
                <option value="all">Всички</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => loadRequests(status)} disabled={loading}>
              Обнови
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <div className="table-wrap">
          <table className="documents-table admin-table">
            <thead>
              <tr>
                <th>Фирма</th>
                <th>Потребител</th>
                <th>Текущ план</th>
                <th>Заявен план</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="7" className="empty-cell">Няма заявки за този статус.</td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.company?.name || '-'}</td>
                  <td>{request.requested_by?.email || '-'}</td>
                  <td>{request.current_plan}</td>
                  <td>{request.requested_plan}</td>
                  <td>{request.status}</td>
                  <td>{request.created_at ? new Date(request.created_at).toLocaleDateString('bg-BG') : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" disabled={loading || request.status !== 'pending'} onClick={() => handleApprove(request.id)}>
                        Одобри
                      </button>
                      <button type="button" className="secondary-button" disabled={loading || request.status !== 'pending'} onClick={() => handleReject(request.id)}>
                        Откажи
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default AdminPage;

import { useState, useEffect, useRef } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './ModificationRequest.css';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function ModificationRequest({ gradeId, studentName, currentScore, currentGradeLetter, classId, className, subjectName, onCancel, onSuccess }) {
  const [proposedScore, setProposedScore] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    teacherApi.getModificationRequests()
      .then(data => {
        if (!cancelled) setRequests(data.requests || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingReqs(false); });
    return () => { cancelled = true; };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setEvidenceFile(null); setFileError(''); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Only PDF, JPG, or PNG files are accepted.');
      setEvidenceFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File must be under 5 MB.');
      setEvidenceFile(null);
      e.target.value = '';
      return;
    }
    setFileError('');
    setEvidenceFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError('Please provide a reason for the modification request.'); return; }
    if (!proposedScore) { setError('Please enter the proposed correct score.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const result = await teacherApi.submitModificationRequest({
        gradeId,
        proposedScore,
        reason,
        evidenceFile: evidenceFile || undefined,
      });
      if (!result.success) throw new Error(result.message || 'Submission failed');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (reqId) => {
    setWithdrawing(reqId);
    try {
      const result = await teacherApi.withdrawModificationRequest(reqId);
      if (result.success) {
        setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'withdrawn' } : r));
      }
    } catch {}
    setWithdrawing(null);
  };

  const statusBadgeClass = (status) => {
    if (status === 'pending')   return 'tch-badge tch-badge--amber';
    if (status === 'approved')  return 'tch-badge tch-badge--green';
    if (status === 'rejected')  return 'tch-badge tch-badge--red';
    if (status === 'withdrawn') return 'tch-badge tch-badge--grey';
    return 'tch-badge tch-badge--grey';
  };

  return (
    <div className="mr-root">
      <div className="mr-warning">
        <span className="material-symbols-outlined">info</span>
        <p>
          <strong>Modification requests are reviewed by the school administrator.</strong>{' '}
          Only submit if there is a genuine data entry error. All requests are logged in the audit trail.
        </p>
      </div>

      {/* Existing requests */}
      {loadingReqs ? (
        <div className="tch-skeleton" style={{ height: 48, marginBottom: 16 }} />
      ) : requests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="mr-section-label">My Requests</p>
          {requests.map(req => (
            <div key={req.id} className="mr-existing-req">
              <div className="mr-existing-req__left">
                <p className="mr-existing-req__student">{req.student_name || req.student}</p>
                <p className="mr-existing-req__detail">
                  {req.current_score} → {req.proposed_score}
                  <span style={{ marginLeft: 6 }}>· {req.subject}</span>
                  <span style={{ marginLeft: 6 }}>· {(req.reason || '').slice(0, 60)}{req.reason?.length > 60 ? '…' : ''}</span>
                </p>
                {req.status === 'rejected' && req.review_reason && (
                  <p className="mr-existing-req__reject-reason">
                    <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle' }}>cancel</span>
                    {' '}Rejected: {req.review_reason}
                  </p>
                )}
                {req.evidence_url && (
                  <a href={req.evidence_url} target="_blank" rel="noopener noreferrer" className="mr-evidence-link">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>attach_file</span> Evidence
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={statusBadgeClass(req.status)}>{req.status}</span>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>
                  {formatRelativeTime(req.created_at)}
                </p>
                {req.status === 'pending' && (
                  <button
                    className="tch-btn tch-btn--ghost tch-btn--sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    disabled={withdrawing === req.id}
                    onClick={() => handleWithdraw(req.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      {withdrawing === req.id ? 'sync' : 'undo'}
                    </span>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <p className="mr-section-label">New Modification Request</p>
      <form onSubmit={handleSubmit} className="mr-form">
        <div className="mr-current-grade">
          <p className="mr-form__label">Current Grade (locked)</p>
          <div className="mr-current-grade__display">
            <span className="mr-current-grade__score">{currentScore}%</span>
            {currentGradeLetter && (
              <span className="tch-badge tch-badge--green">{currentGradeLetter}</span>
            )}
            <span className="material-symbols-outlined" style={{ color: 'var(--tch-primary)', fontSize: 18 }}>lock</span>
          </div>
        </div>

        <div>
          <label className="tch-label">Proposed Correct Score</label>
          <input
            type="number"
            min="0" max="100"
            className="tch-input"
            style={{ maxWidth: 140 }}
            placeholder="0–100"
            value={proposedScore}
            onChange={e => setProposedScore(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="tch-label">Reason for Modification <span style={{ color: 'var(--tch-error)' }}>*</span></label>
          <textarea
            className="tch-textarea"
            rows={4}
            maxLength={500}
            placeholder="Explain the reason for this correction (e.g. data entry error — correct score from exam script is X)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
          <p style={{ fontSize: 11, color: 'var(--tch-text-secondary)', margin: '4px 0 0' }}>
            {reason.length}/500 characters
          </p>
        </div>

        <div>
          <label className="tch-label">
            Supporting Evidence <span style={{ color: 'var(--tch-text-secondary)', fontWeight: 400 }}>(optional · PDF / JPG / PNG · max 5 MB)</span>
          </label>
          <div className="mr-file-wrap">
            <button
              type="button"
              className="tch-btn tch-btn--ghost tch-btn--sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined">attach_file</span>
              {evidenceFile ? evidenceFile.name : 'Choose file…'}
            </button>
            {evidenceFile && (
              <button
                type="button"
                className="tch-btn tch-btn--ghost tch-btn--sm"
                style={{ padding: '4px 6px' }}
                onClick={() => { setEvidenceFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {fileError && (
            <p style={{ fontSize: 11, color: 'var(--tch-error)', margin: '4px 0 0' }}>{fileError}</p>
          )}
        </div>

        {error && (
          <div className="tch-security-banner">
            <span className="material-symbols-outlined">error</span>
            <div>
              <p className="tch-security-banner__title">Please fix the following</p>
              <p className="tch-security-banner__text">{error}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {onCancel && (
            <button type="button" className="tch-btn tch-btn--ghost" style={{ flex: 1 }} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="tch-btn tch-btn--primary" style={{ flex: 1 }} disabled={submitting || !!fileError}>
            <span className="material-symbols-outlined">{submitting ? 'sync' : 'send'}</span>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

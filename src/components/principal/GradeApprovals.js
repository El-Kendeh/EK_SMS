import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import { principalApi } from '../../api/adminApi';
import Modal from './Modal';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const fmtNum = (n) => (n === null || n === undefined ? '—' : n);

export default function GradeApprovals({ schoolId }) {
  const [status, setStatus]   = useState('pending');
  const [classId, setClassId] = useState('');
  const [termId, setTermId]   = useState('');
  const [classes, setClasses] = useState([]);
  const [terms, setTerms]     = useState([]);

  const [requests, setRequests] = useState([]);
  const [counts, setCounts]     = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState(new Set());

  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]               = useState(null);
  const [feedback, setFeedback]         = useState(null);

  const [bulkPrompt, setBulkPrompt]   = useState(null); // 'approve' | 'reject' | null
  const [bulkComment, setBulkComment] = useState('');

  const [commentRow, setCommentRow]   = useState(null); // request object
  const [commentText, setCommentText] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    apiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
    apiClient.get('/api/school/terms/').then(d => setTerms(d.terms || [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { status, page, page_size: PAGE_SIZE };
    if (classId) params.class_id = classId;
    if (termId) params.term_id = termId;

    principalApi.listGradeApprovals(params)
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load grade approvals'); return; }
        setRequests(res.requests || []);
        setCounts(res.counts || { pending: 0, approved: 0, rejected: 0 });
        setTotal(res.total ?? (res.requests || []).length);
        setSelected(new Set());
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, classId, termId, page]);

  useEffect(() => { load(); }, [load]);

  // Filter changes reset to the first page.
  useEffect(() => { setPage(1); }, [status, classId, termId]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => (prev.size === requests.length ? new Set() : new Set(requests.map(r => r.id))));
  };

  const runBulkAction = async (action, comment) => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      const res = await principalApi.reviewGradeChange({ gradeIds: Array.from(selected), action, comment: comment || undefined });
      if (res?.success === false) {
        setFeedback({ type: 'error', msg: res.message || 'Action failed' });
      } else {
        setFeedback({ type: 'success', msg: res.message || `${res.count ?? selected.size} grade(s) ${action}d` });
        load();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Action failed' });
    } finally {
      setActionLoading(false);
      setBulkPrompt(null);
      setBulkComment('');
    }
  };

  const submitComment = async () => {
    if (!commentRow || !commentText.trim()) return;
    setActionLoading(true);
    try {
      const res = await principalApi.commentReportCard({ gradeId: commentRow.id, comment: commentText.trim() });
      if (res?.success === false) {
        setFeedback({ type: 'error', msg: res.message || 'Failed to save comment' });
      } else {
        setFeedback({ type: 'success', msg: 'Comment saved' });
        load();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to save comment' });
    } finally {
      setActionLoading(false);
      setCommentRow(null);
      setCommentText('');
    }
  };

  const allSelected = requests.length > 0 && selected.size === requests.length;

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`grade-approvals-${stamp}.csv`, [
      ['Student', 'Admission #', 'Subject', 'Class', 'Term', 'CA', 'Midterm', 'Final', 'Total', 'Grade', 'Status'],
      ...requests.map(r => [
        r.student_name, r.admission_number, r.subject_name, r.class_name, r.term_name,
        r.ca ?? '', r.midterm ?? '', r.final ?? '', r.total ?? '',
        r.grade_letter ?? '', r.approval_status,
      ]),
    ]);
  };

  return (
    <div className="pu-page ga-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Grade Approvals</h1>
          <p className="ska-page-sub">Review and approve teacher-submitted grade changes</p>
        </div>
      </div>

      {feedback && (
        <div className={`ga-banner ga-banner--${feedback.type}`}>
          <Ic name={feedback.type === 'success' ? 'check_circle' : 'error'} size="sm" />
          {feedback.msg}
        </div>
      )}

      <div className="ga-tabs">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            type="button"
            className={`ga-tab ga-tab--${t.key}${status === t.key ? ' ga-tab--active' : ''}`}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
            <span className="ga-tab__count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="ga-filters">
        <select className="ga-select" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="ga-select" value={termId} onChange={e => setTermId(e.target.value)}>
          <option value="">All Terms</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" className="ga-btn ga-btn--ghost" disabled={requests.length === 0}
          onClick={exportCsv} title="Export the rows currently shown">
          <Ic name="download" size="sm" /> Export CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="ga-bulkbar">
          <span className="ga-bulkbar__count">{selected.size} selected</span>
          <div className="ga-bulkbar__actions">
            <button type="button" className="ga-btn ga-btn--approve" disabled={actionLoading}
              onClick={() => setBulkPrompt('approve')}>
              <Ic name="check" size="sm" /> Approve
            </button>
            <button type="button" className="ga-btn ga-btn--reject" disabled={actionLoading}
              onClick={() => setBulkPrompt('reject')}>
              <Ic name="close" size="sm" /> Reject
            </button>
          </div>
        </div>
      )}

      {bulkPrompt && (
        <Modal title={`${bulkPrompt === 'approve' ? 'Approve' : 'Reject'} ${selected.size} grade(s)`} onClose={() => setBulkPrompt(null)}>
            <textarea
              className="ga-textarea"
              rows={3}
              placeholder="Optional comment for these grades…"
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
            />
            <div className="ga-modal__actions">
              <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setBulkPrompt(null)}>Cancel</button>
              <button
                type="button"
                className={`ga-btn ${bulkPrompt === 'approve' ? 'ga-btn--approve' : 'ga-btn--reject'}`}
                disabled={actionLoading}
                onClick={() => runBulkAction(bulkPrompt, bulkComment.trim())}
              >
                Confirm {bulkPrompt === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
        </Modal>
      )}

      {commentRow && (
        <Modal title={`Comment — ${commentRow.student_name}`} onClose={() => setCommentRow(null)}>
            <p className="ga-modal__sub">{commentRow.subject_name} · {commentRow.term_name}</p>
            {commentRow.remarks && (
              <pre className="ga-modal__remarks">{commentRow.remarks}</pre>
            )}
            <textarea
              className="ga-textarea"
              rows={3}
              placeholder="Add a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <div className="ga-modal__actions">
              <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setCommentRow(null)}>Cancel</button>
              <button type="button" className="ga-btn ga-btn--primary" disabled={actionLoading || !commentText.trim()}
                onClick={submitComment}>
                Save Comment
              </button>
            </div>
        </Modal>
      )}

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load grade approvals</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && requests.length === 0 && (
        <div className="pu-empty">
          <Ic name="task_alt" size="xl" />
          <p className="pu-empty__title">No {status} grade changes</p>
          <p className="pu-empty__desc">Adjust the filters or check back later.</p>
        </div>
      )}

      {!error && !loading && requests.length > 0 && (
        <div className="ga-table-wrap">
          <table className="ga-table">
            <thead>
              <tr>
                {status === 'pending' && (
                  <th className="ga-col-check">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </th>
                )}
                <th>Student</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Term</th>
                <th className="ga-col-num">CA</th>
                <th className="ga-col-num">Midterm</th>
                <th className="ga-col-num">Final</th>
                <th className="ga-col-num">Total</th>
                <th>Grade</th>
                <th>Status</th>
                <th className="ga-col-actions">Comment</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className={selected.has(r.id) ? 'ga-row--selected' : ''}>
                  {status === 'pending' && (
                    <td className="ga-col-check" data-label="">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.student_name}`} />
                    </td>
                  )}
                  <td data-label="Student">
                    <div className="ga-student">
                      <strong>{r.student_name}</strong>
                      <span className="ga-student__sub">{r.admission_number}</span>
                    </div>
                  </td>
                  <td data-label="Subject">{r.subject_name} {r.subject_code ? <span className="ga-muted">({r.subject_code})</span> : null}</td>
                  <td data-label="Class">{r.class_name}</td>
                  <td data-label="Term">{r.term_name}</td>
                  <td className="ga-col-num" data-label="CA">{fmtNum(r.ca)}</td>
                  <td className="ga-col-num" data-label="Midterm">{fmtNum(r.midterm)}</td>
                  <td className="ga-col-num" data-label="Final">{fmtNum(r.final)}</td>
                  <td className="ga-col-num" data-label="Total"><strong>{fmtNum(r.total)}</strong></td>
                  <td data-label="Grade">
                    <span className="ga-grade">{r.grade_letter || '—'}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`ga-badge ga-badge--${r.approval_status}`}>{r.approval_status}</span>
                  </td>
                  <td className="ga-col-actions" data-label="Comment">
                    <button type="button" className="ga-icon-btn" onClick={() => { setCommentRow(r); setCommentText(''); }} title="View / add comment">
                      <Ic name="comment" size="sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && !loading && total > PAGE_SIZE && (
        <div className="ga-pager">
          <button type="button" className="ga-btn ga-btn--ghost" disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}>
            <Ic name="chevron_left" size="sm" /> Prev
          </button>
          <span className="ga-pager__info">
            Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} total
          </span>
          <button type="button" className="ga-btn ga-btn--ghost" disabled={page >= Math.ceil(total / PAGE_SIZE)}
            onClick={() => setPage(p => p + 1)}>
            Next <Ic name="chevron_right" size="sm" />
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { principalApi } from '../../api/adminApi';
import Modal from './Modal';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';
import './ReportCardApproval.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const fmtNum = (n) => (n === null || n === undefined ? '—' : n);

export default function ReportCardApproval({ schoolId }) {
  const [reportCards, setReportCards] = useState([]);
  const [term, setTerm] = useState(null);
  const [termId, setTermId] = useState(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());

  const [commentTarget, setCommentTarget] = useState(null); // { studentName, subject }
  const [commentText, setCommentText] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(null); // { studentIds } — [] = all approved
  const [truncated, setTruncated] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.listReportCards()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load report cards'); return; }
        setReportCards(res.report_cards || []);
        setTerm(res.term || null);
        setTermId(res.term_id || null);
        setApprovedCount(res.approved_count || 0);
        setTotalCount(res.total_count || 0);
        setTruncated(!!res.truncated);
        setSelected(new Set());
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const toggleExpand = (studentId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const toggleSelect = (studentId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  // Only unpublished students are selectable — published cards can't be re-published.
  const selectable = reportCards.filter(rc => !rc.published);

  const toggleSelectAll = () => {
    setSelected(prev => (prev.size === selectable.length ? new Set() : new Set(selectable.map(rc => rc.student_id))));
  };

  const publish = async (studentIds) => {
    if (!termId) return;
    setPublishLoading(true);
    try {
      const res = await principalApi.publishReportCards({ studentIds, termId });
      if (res?.success === false) {
        setFeedback({ type: 'error', msg: res.message || 'Publish failed' });
      } else {
        setFeedback({ type: 'success', msg: res.message || `${res.published_count ?? 0} report card(s) published` });
        load();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Publish failed' });
    } finally {
      setPublishLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentTarget || !commentText.trim()) return;
    if (!commentTarget.subject.id) {
      setFeedback({ type: 'error', msg: 'This grade entry cannot be commented on' });
      setCommentTarget(null);
      return;
    }
    setActionLoading(true);
    try {
      const res = await principalApi.commentReportCard({ gradeId: commentTarget.subject.id, comment: commentText.trim() });
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
      setCommentTarget(null);
      setCommentText('');
    }
  };

  const allSelected = selectable.length > 0 && selected.size === selectable.length;

  return (
    <div className="pu-page rca-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Report Card Approval</h1>
          <p className="ska-page-sub">{term ? `Term: ${term}` : 'Review and publish student report cards'}</p>
        </div>
        <button type="button" className="ga-btn ga-btn--primary" disabled={publishLoading || approvedCount === 0}
          onClick={() => setConfirmPublish({ studentIds: [] })}>
          <Ic name="publish" size="sm" /> Publish All Approved
        </button>
      </div>

      {feedback && (
        <div className={`ga-banner ga-banner--${feedback.type}`}>
          <Ic name={feedback.type === 'success' ? 'check_circle' : 'error'} size="sm" />
          {feedback.msg}
        </div>
      )}

      <div className="rca-summary">
        <div className="rca-summary__item">
          <span className="rca-summary__num">{totalCount}</span>
          <span className="rca-summary__label">Total grades</span>
        </div>
        <div className="rca-summary__item">
          <span className="rca-summary__num rca-summary__num--green">{approvedCount}</span>
          <span className="rca-summary__label">Approved</span>
        </div>
        <div className="rca-summary__item">
          <span className="rca-summary__num">{reportCards.length}</span>
          <span className="rca-summary__label">Students</span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="ga-bulkbar">
          <span className="ga-bulkbar__count">{selected.size} student(s) selected</span>
          <div className="ga-bulkbar__actions">
            <button type="button" className="ga-btn ga-btn--primary" disabled={publishLoading}
              onClick={() => setConfirmPublish({ studentIds: Array.from(selected) })}>
              <Ic name="publish" size="sm" /> Publish Selected
            </button>
          </div>
        </div>
      )}

      {commentTarget && (
        <Modal title={`Comment — ${commentTarget.studentName}`} onClose={() => setCommentTarget(null)}>
            <p className="ga-modal__sub">{commentTarget.subject.subject_name}</p>
            {commentTarget.subject.remarks && (
              <pre className="ga-modal__remarks">{commentTarget.subject.remarks}</pre>
            )}
            <textarea
              className="ga-textarea"
              rows={3}
              placeholder="Add a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <div className="ga-modal__actions">
              <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setCommentTarget(null)}>Cancel</button>
              <button type="button" className="ga-btn ga-btn--primary" disabled={actionLoading || !commentText.trim()}
                onClick={submitComment}>
                Save Comment
              </button>
            </div>
        </Modal>
      )}

      {confirmPublish && (
        <Modal title="Publish report cards?" onClose={() => setConfirmPublish(null)}>
          <p className="ga-modal__sub">
            This releases {confirmPublish.studentIds.length === 0
              ? 'every approved report card'
              : `${confirmPublish.studentIds.length} report card(s)`}
            {term ? ` for ${term}` : ''} to parents and students. Published cards
            cannot be silently retracted.
          </p>
          <div className="ga-modal__actions">
            <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setConfirmPublish(null)}>Cancel</button>
            <button type="button" className="ga-btn ga-btn--primary" disabled={publishLoading}
              onClick={() => { const ids = confirmPublish.studentIds; setConfirmPublish(null); publish(ids); }}>
              <Ic name="publish" size="sm" /> Publish
            </button>
          </div>
        </Modal>
      )}

      {truncated && (
        <div className="ga-banner ga-banner--error">
          <Ic name="warning" size="sm" />
          Showing the most recent 500 grade rows — the counts above are exact, but this list may be incomplete.
        </div>
      )}

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load report cards</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && reportCards.length === 0 && (
        <div className="pu-empty">
          <Ic name="description" size="xl" />
          <p className="pu-empty__title">No report cards yet</p>
          <p className="pu-empty__desc">Grades for the active term will appear here once entered.</p>
        </div>
      )}

      {!error && !loading && reportCards.length > 0 && (
        <>
          <div className="rca-list-head">
            <label className="rca-checkall">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              Select all
            </label>
          </div>

          <div className="rca-list">
            {reportCards.map(rc => {
              const isOpen = expanded.has(rc.student_id);
              return (
                <div key={rc.student_id} className="rca-card">
                  <div className="rca-card__head">
                    <input type="checkbox" checked={selected.has(rc.student_id)} onChange={() => toggleSelect(rc.student_id)}
                      disabled={rc.published} aria-label={`Select ${rc.student_name}`} />
                    <div className="rca-card__info">
                      <strong>{rc.student_name}</strong>
                      <span className="rca-card__sub">{rc.admission_number}</span>
                    </div>
                    <span className={`ga-badge ${rc.published ? 'ga-badge--approved' : rc.approved ? 'ga-badge--approved' : 'ga-badge--pending'}`}>
                      {rc.published ? 'Published' : rc.approved ? 'Ready to publish' : 'Pending approvals'}
                    </span>
                    <button type="button" className="ga-icon-btn" onClick={() => toggleExpand(rc.student_id)}
                      title={isOpen ? 'Collapse' : 'Expand'}>
                      <Ic name={isOpen ? 'expand_less' : 'expand_more'} size="sm" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="rca-table-wrap">
                      <table className="ga-table rca-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th className="ga-col-num">CA</th>
                            <th className="ga-col-num">Midterm</th>
                            <th className="ga-col-num">Final</th>
                            <th className="ga-col-num">Total</th>
                            <th>Grade</th>
                            <th className="ga-col-actions">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rc.subjects.map((s, idx) => (
                            <tr key={s.id || idx}>
                              <td data-label="Subject">{s.subject_name} {s.subject_code ? <span className="ga-muted">({s.subject_code})</span> : null}</td>
                              <td className="ga-col-num" data-label="CA">{fmtNum(s.ca)}</td>
                              <td className="ga-col-num" data-label="Midterm">{fmtNum(s.midterm)}</td>
                              <td className="ga-col-num" data-label="Final">{fmtNum(s.final)}</td>
                              <td className="ga-col-num" data-label="Total"><strong>{fmtNum(s.total)}</strong></td>
                              <td data-label="Grade"><span className="ga-grade">{s.grade_letter || '—'}</span></td>
                              <td className="ga-col-actions" data-label="Comment">
                                <button type="button" className="ga-icon-btn"
                                  onClick={() => { setCommentTarget({ studentName: rc.student_name, subject: s }); setCommentText(''); }}
                                  title="View / add comment">
                                  <Ic name="comment" size="sm" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

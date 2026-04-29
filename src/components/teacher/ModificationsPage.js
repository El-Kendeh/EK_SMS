import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './ModificationsPage.css';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function statusBadge(status) {
  if (status === 'pending')   return 'tch-badge--amber';
  if (status === 'approved')  return 'tch-badge--green';
  if (status === 'rejected')  return 'tch-badge--red';
  return 'tch-badge--grey';
}

function statusIcon(status) {
  if (status === 'pending')  return 'pending';
  if (status === 'approved') return 'check_circle';
  if (status === 'rejected') return 'cancel';
  return 'undo';
}

export default function ModificationsPage({ navigateTo }) {
  const { assignedClasses, selectedClassId } = useTeacher();

  // Existing requests
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);

  // New request form
  const [showForm, setShowForm] = useState(false);
  const [formClass, setFormClass] = useState(selectedClassId || '');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [proposedScore, setProposedScore] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    teacherApi.getModificationRequests()
      .then(data => { if (!cancelled) setRequests(data.requests || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingReqs(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!formClass) { setStudents([]); setSelectedStudent(null); return; }
    setLoadingStudents(true);
    teacherApi.getClassGrades(formClass)
      .then(data => {
        const entries = data.entries || [];
        const studs = data.students || [];
        const locked = entries
          .filter(e => e.is_locked)
          .map(e => {
            const s = studs.find(st => st.id === e.student_id) || {};
            return {
              id: e.id,
              studentId: e.student_id,
              studentName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Student #${e.student_id}`,
              currentScore: Math.round((parseFloat(e.ca) || 0) + (parseFloat(e.midterm) || 0) + (parseFloat(e.final_exam) || 0)),
              gradeLetter: e.grade_letter,
              subjectName: e.subject_name,
            };
          });
        setStudents(locked);
        setSelectedStudent(null);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [formClass]);

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
    if (!selectedStudent) { setFormError('Select a student grade to request modification for.'); return; }
    if (!proposedScore) { setFormError('Enter the proposed correct score.'); return; }
    if (!reason.trim()) { setFormError('Please provide a reason.'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const result = await teacherApi.submitModificationRequest({
        gradeId: selectedStudent.id,
        proposedScore,
        reason,
        evidenceFile: evidenceFile || undefined,
      });
      if (!result.success) throw new Error(result.message || 'Submission failed');
      setSuccessMsg('Modification request submitted. The school administrator will review it.');
      setShowForm(false);
      setProposedScore('');
      setReason('');
      setEvidenceFile(null);
      setSelectedStudent(null);
      // Refresh list
      teacherApi.getModificationRequests()
        .then(data => setRequests(data.requests || []))
        .catch(() => {});
    } catch (err) {
      setFormError(err.message || 'Failed to submit request');
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

  const filtered = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="mp-root">
      {/* Header */}
      <div className="mp-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Grade Modification Requests</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            {pendingCount > 0 ? `${pendingCount} pending review` : 'All requests reviewed'}
          </p>
        </div>
        <button className="tch-btn tch-btn--primary" onClick={() => { setShowForm(true); setSuccessMsg(''); setFormError(''); }}>
          <span className="material-symbols-outlined">add</span>
          New Request
        </button>
      </div>

      {/* Policy notice */}
      <div className="mp-notice">
        <span className="material-symbols-outlined">info</span>
        <p>
          Grade modification requests are reviewed by the school administrator. Only submit for genuine data entry errors.
          All requests are permanently logged in the audit trail and subject to admin approval.
        </p>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            className="mp-success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="material-symbols-outlined">check_circle</span>
            <p style={{ margin: 0 }}>{successMsg}</p>
            <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setSuccessMsg('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Request Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="tch-card tch-card--pad mp-form-card"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mp-form-header">
              <p className="mp-section-label">New Modification Request</p>
              <button
                className="tch-btn tch-btn--ghost tch-btn--sm"
                onClick={() => { setShowForm(false); setFormError(''); }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mp-form">
              {/* Step 1: Class */}
              <div>
                <label className="tch-label">1. Select Class</label>
                <select
                  className="tch-select"
                  style={{ maxWidth: 320 }}
                  value={formClass}
                  onChange={e => { setFormClass(e.target.value); setSelectedStudent(null); }}
                >
                  <option value="">— Select class —</option>
                  {assignedClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject?.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Student grade */}
              {formClass && (
                <div>
                  <label className="tch-label">2. Select Locked Grade</label>
                  {loadingStudents ? (
                    <div className="tch-skeleton" style={{ height: 40, maxWidth: 320 }} />
                  ) : students.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--tch-text-secondary)', margin: '4px 0' }}>
                      No locked grades found for this class.
                    </p>
                  ) : (
                    <select
                      className="tch-select"
                      style={{ maxWidth: 400 }}
                      value={selectedStudent?.id || ''}
                      onChange={e => {
                        const s = students.find(st => String(st.id) === e.target.value);
                        setSelectedStudent(s || null);
                        setProposedScore('');
                      }}
                    >
                      <option value="">— Select student grade —</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.studentName} — {s.currentScore}% ({s.gradeLetter}) · {s.subjectName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Step 3: Details */}
              {selectedStudent && (
                <>
                  <div className="mp-current-grade">
                    <p className="tch-label" style={{ margin: '0 0 6px' }}>Current locked grade</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mp-locked-score">{selectedStudent.currentScore}%</span>
                      <span className="tch-badge tch-badge--green">{selectedStudent.gradeLetter}</span>
                      <span className="material-symbols-outlined" style={{ color: 'var(--tch-primary)', fontSize: 18 }}>lock</span>
                      <span style={{ color: 'var(--tch-text-secondary)', fontSize: 13 }}>{selectedStudent.studentName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="tch-label">Proposed Correct Score *</label>
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
                    <label className="tch-label">Reason for Modification *</label>
                    <textarea
                      className="tch-textarea"
                      rows={4}
                      maxLength={500}
                      placeholder="Explain the reason for this correction, e.g. data entry error — correct score from exam script is X..."
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      required
                    />
                    <p style={{ fontSize: 11, color: 'var(--tch-text-secondary)', margin: '3px 0 0' }}>
                      {reason.length}/500
                    </p>
                  </div>

                  <div>
                    <label className="tch-label">
                      Supporting Evidence{' '}
                      <span style={{ color: 'var(--tch-text-secondary)', fontWeight: 400 }}>
                        (optional · PDF / JPG / PNG · max 5 MB)
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                          onClick={() => { setEvidenceFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileChange} />
                    {fileError && <p style={{ fontSize: 11, color: 'var(--tch-error)', margin: '3px 0 0' }}>{fileError}</p>}
                  </div>
                </>
              )}

              {formError && (
                <div className="tch-security-banner">
                  <span className="material-symbols-outlined">error</span>
                  <p style={{ margin: 0 }}>{formError}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="tch-btn tch-btn--ghost" onClick={() => { setShowForm(false); setFormError(''); }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tch-btn tch-btn--primary"
                  disabled={submitting || !selectedStudent || !!fileError}
                >
                  <span className="material-symbols-outlined">{submitting ? 'sync' : 'send'}</span>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="mp-filter-bar">
        <p className="mp-section-label">All Requests</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'pending', 'approved', 'rejected', 'withdrawn'].map(s => (
            <button
              key={s}
              className={`tch-btn tch-btn--ghost tch-btn--sm ${filterStatus === s ? 'mp-filter-btn--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s || 'All'}
              {s === 'pending' && pendingCount > 0 && (
                <span className="tch-badge tch-badge--amber" style={{ marginLeft: 4, padding: '1px 5px' }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Request list */}
      {loadingReqs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">rate_review</span>
          <p>{filterStatus ? `No ${filterStatus} requests` : 'No modification requests yet'}</p>
        </div>
      ) : (
        <div className="mp-list">
          {filtered.map((req, i) => (
            <motion.div
              key={req.id}
              className={`tch-card mp-req-item ${req.status === 'pending' ? 'mp-req-item--pending' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="mp-req-item__icon">
                <span className="material-symbols-outlined">{statusIcon(req.status)}</span>
              </div>
              <div className="mp-req-item__body">
                <p className="mp-req-item__student">{req.student_name || req.student}</p>
                <div className="mp-req-item__detail">
                  <span className="mp-score-arrow">
                    <strong>{req.current_score}%</strong>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                    <strong style={{ color: 'var(--tch-primary)' }}>{req.proposed_score}%</strong>
                  </span>
                  {req.subject && (
                    <span className="tch-chip">
                      <span className="material-symbols-outlined">subject</span>
                      {req.subject}
                    </span>
                  )}
                </div>
                <p className="mp-req-item__reason">{(req.reason || '').slice(0, 100)}{req.reason?.length > 100 ? '…' : ''}</p>
                {req.status === 'rejected' && req.review_reason && (
                  <p className="mp-req-item__reject">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cancel</span>
                    Rejected: {req.review_reason}
                  </p>
                )}
                {req.evidence_url && (
                  <a href={req.evidence_url} target="_blank" rel="noopener noreferrer" className="mp-evidence-link">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>attach_file</span>
                    View Evidence
                  </a>
                )}
              </div>
              <div className="mp-req-item__right">
                <span className={`tch-badge ${statusBadge(req.status)}`}>{req.status}</span>
                <p className="mp-req-item__time">{formatRelativeTime(req.created_at)}</p>
                {req.status === 'pending' && (
                  <button
                    className="tch-btn tch-btn--ghost tch-btn--sm"
                    disabled={withdrawing === req.id}
                    onClick={() => handleWithdraw(req.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      {withdrawing === req.id ? 'sync' : 'undo'}
                    </span>
                    Withdraw
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

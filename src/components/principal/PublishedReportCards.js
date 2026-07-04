import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';
import './ReportCardApproval.css';
import './PublishedReportCards.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const fmtNum = (n) => (n === null || n === undefined ? '—' : n);

export default function PublishedReportCards({ schoolId }) {
  const [reportCards, setReportCards] = useState([]);
  const [term, setTerm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [truncated, setTruncated] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.listReportCards()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load report cards'); return; }
        // "Published" means every grade is actually released to families —
        // not merely approved (approved-but-unpublished lives on the Approval page).
        setReportCards((res.report_cards || []).filter(rc => rc.published));
        setTerm(res.term || null);
        setTruncated(!!res.truncated);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (studentId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const visible = useMemo(() => {
    if (!search.trim()) return reportCards;
    const q = search.trim().toLowerCase();
    return reportCards.filter(rc =>
      rc.student_name?.toLowerCase().includes(q) ||
      rc.admission_number?.toLowerCase().includes(q)
    );
  }, [reportCards, search]);

  const totalSubjects = useMemo(
    () => reportCards.reduce((sum, rc) => sum + (rc.subjects?.length || 0), 0),
    [reportCards]
  );

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    // One row per subject — flat and spreadsheet-friendly.
    downloadCsv(`published-report-cards-${stamp}.csv`, [
      ['Student', 'Admission #', 'Term', 'Subject', 'CA', 'Midterm', 'Final', 'Total', 'Grade'],
      ...reportCards.flatMap(rc => (rc.subjects || []).map(s => [
        rc.student_name, rc.admission_number, term || '',
        s.subject_name, s.ca ?? '', s.midterm ?? '', s.final ?? '', s.total ?? '', s.grade_letter ?? '',
      ])),
    ]);
  };

  return (
    <div className="pu-page prp-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Published Report Cards</h1>
          <p className="ska-page-sub">{term ? `Term: ${term} — ` : ''}Report cards released to parents and students</p>
        </div>
        {reportCards.length > 0 && (
          <button type="button" className="ga-btn ga-btn--ghost prp-export-btn" onClick={exportCsv}
            title="Export all published grades (one row per subject)">
            <Ic name="download" size="sm" /> Export CSV
          </button>
        )}
      </div>

      {truncated && !error && (
        <div className="ga-banner ga-banner--error">
          <Ic name="warning" size="sm" />
          Showing the most recent 500 grade rows — this list may be incomplete.
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
          <Ic name="workspace_premium" size="xl" />
          <p className="pu-empty__title">No published report cards yet</p>
          <p className="pu-empty__desc">Report cards appear here once every grade for a student is approved and published.</p>
        </div>
      )}

      {!error && !loading && reportCards.length > 0 && (
        <>
          <div className="rca-summary">
            <div className="rca-summary__item">
              <span className="rca-summary__num rca-summary__num--green">{reportCards.length}</span>
              <span className="rca-summary__label">Published students</span>
            </div>
            <div className="rca-summary__item">
              <span className="rca-summary__num">{totalSubjects}</span>
              <span className="rca-summary__label">Approved grades</span>
            </div>
          </div>

          <div className="prp-controls">
            <div className="prp-search">
              <Ic name="search" size="sm" />
              <input
                type="text"
                placeholder="Search by name or admission number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {visible.length === 0 && (
            <div className="pu-empty">
              <Ic name="search_off" size="xl" />
              <p className="pu-empty__title">No students match "{search}"</p>
            </div>
          )}

          <div className="rca-list">
            {visible.map(rc => {
              const isOpen = expanded.has(rc.student_id);
              return (
                <div key={rc.student_id} className="rca-card prp-card">
                  <div className="rca-card__head">
                    <span className="prp-card__check"><Ic name="verified" size="sm" /></span>
                    <div className="rca-card__info">
                      <strong>{rc.student_name}</strong>
                      <span className="rca-card__sub">{rc.admission_number}</span>
                    </div>
                    <span className="ga-badge ga-badge--approved">Published</span>
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

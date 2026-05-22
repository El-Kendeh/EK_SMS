import { useEffect, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './PrintTermSummary.css';

// One-page A4 print-friendly term summary. Designed so guardians without
// smartphones can take the printed copy to a print shop or kiosk.
export default function PrintTermSummary() {
  const [profile, setProfile] = useState(null);
  const [term, setTerm] = useState(null);
  const [grades, setGrades] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    Promise.all([
      studentApi.getProfile(),
      studentApi.getCurrentTerm(),
    ]).then(([p, t]) => {
      setProfile(p); setTerm(t);
      return Promise.all([
        studentApi.getGrades(t.id),
        studentApi.getGradesSummary(t.id),
      ]);
    }).then(([g, s]) => { setGrades(g); setSummary(s); }).catch(() => {});
  }, []);

  if (!profile || !grades || !summary || !term) {
    return <div className="pts"><Skeleton height={400} radius={12} /></div>;
  }

  const integrityHash = `term-${profile.studentNumber}-${term.id}`;
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(integrityHash)}`;
  const issued = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pts">
      <div className="pts__toolbar no-print">
        <div>
          <h2>Term summary (printable)</h2>
          <p>Designed for A4 paper. Use your browser to print or save as PDF.</p>
        </div>
        <button onClick={() => window.print()}>
          <span className="material-symbols-outlined">print</span>
          Print / save PDF
        </button>
      </div>

      <article className="pts__page">
        <header className="pts__head">
          <div>
            <h1>El-Kendeh Smart School</h1>
            <p>Official Term Summary · {term.name} {term.academicYear || ''}</p>
          </div>
          <QRCode value={verifyUrl} size={80} />
        </header>

        <section className="pts__student">
          <dl>
            <div><dt>Student</dt><dd>{profile.fullName}</dd></div>
            <div><dt>Student #</dt><dd>{profile.studentNumber}</dd></div>
            <div><dt>Class</dt><dd>{profile.classroom}</dd></div>
            <div><dt>Issued</dt><dd>{issued}</dd></div>
          </dl>
        </section>

        <section>
          <h3>Subjects</h3>
          <table>
            <thead>
              <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Status</th></tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  <td>{g.subject?.name}</td>
                  <td>{g.score}%</td>
                  <td>{g.gradeLetter}</td>
                  <td>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pts__totals">
          <div><strong>Term average:</strong> {summary.overallAverage?.toFixed?.(1)}%</div>
          <div><strong>Class rank:</strong> {summary.classRank} / {summary.totalStudentsInClass}</div>
          <div><strong>Subjects passed:</strong> {summary.subjectsPassed}/{summary.totalSubjects}</div>
        </section>

        <footer className="pts__foot">
          <span>Integrity hash: <code>{integrityHash}</code></span>
          <span>Verify at {verifyUrl}</span>
        </footer>
      </article>
    </div>
  );
}

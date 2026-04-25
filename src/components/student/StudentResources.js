import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './StudentResources.css';

const FILTERS = [
  { key: 'all',           label: 'All' },
  { key: 'syllabus',      label: 'Syllabus' },
  { key: 'lecture-notes', label: 'Lecture Notes' },
  { key: 'exams',         label: 'Exams' },
  { key: 'handouts',      label: 'Handouts' },
];

const FILE_TYPE = {
  pdf:  { icon: 'picture_as_pdf', bg: '#FEF2F2', color: '#EF4444' },
  docx: { icon: 'description',    bg: '#EFF6FF', color: '#3B82F6' },
  pptx: { icon: 'slideshow',      bg: '#FFF7ED', color: '#F97316' },
  default: { icon: 'insert_drive_file', bg: '#F9FAFB', color: '#6B7280' },
};

function ResourceFile({ file }) {
  const meta = FILE_TYPE[file.type] || FILE_TYPE.default;

  if (file.locked) {
    return (
      <div className="sres-file sres-file--locked">
        <div className="sres-file__icon" style={{ background: '#F3F4F6' }}>
          <span className="material-symbols-outlined" style={{ color: '#9CA3AF' }}>{meta.icon}</span>
        </div>
        <div className="sres-file__info">
          <div className="sres-file__name">{file.title}</div>
          {file.availableDate && (
            <div className="sres-file__size">Available {file.availableDate}</div>
          )}
        </div>
        <span
          className="material-symbols-outlined sres-file__lock-icon"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lock
        </span>
      </div>
    );
  }

  return (
    <div className="sres-file">
      <div className="sres-file__icon" style={{ background: meta.bg }}>
        <span className="material-symbols-outlined" style={{ color: meta.color }}>{meta.icon}</span>
      </div>
      <div className="sres-file__info">
        <div className="sres-file__name">{file.title}</div>
        <div className="sres-file__size">{file.size} · {file.type.toUpperCase()}</div>
      </div>
      <button className="sres-file__download" aria-label={`Download ${file.title}`}>
        <span className="material-symbols-outlined">download</span>
        <span className="sres-file__download-label">Download</span>
      </button>
    </div>
  );
}

function SubjectCard({ subject, filter, search, index }) {
  const files = subject.files.filter((f) => {
    const matchesFilter = filter === 'all' || f.category === filter;
    const matchesSearch = !search || f.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (files.length === 0) return null;

  return (
    <motion.div
      className="sres-subject-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05 }}
    >
      <div className="sres-subject-card__header">
        <div>
          <span
            className="sres-subject-card__code"
            style={{ color: subject.color, background: `${subject.color}15` }}
          >
            {subject.subjectCode}
          </span>
          <h3 className="sres-subject-card__name">{subject.subject}</h3>
        </div>
        <span className="sres-subject-card__count">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="sres-subject-card__files">
        {files.map((f) => <ResourceFile key={f.id} file={f} />)}
      </div>
    </motion.div>
  );
}

export default function StudentResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getResources();
      setResources(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const featured = resources.find((r) => r.featured);
  const showFeatured = featured && filter === 'all' && !search;
  const gridResources = showFeatured ? resources.filter((r) => !r.featured) : resources;

  const totalFiles = resources.reduce((s, r) => s + r.files.length, 0);

  return (
    <div className="sres">
      {/* Header */}
      <div className="sres__header">
        <div>
          <h1 className="sres__title">Learning Materials</h1>
          <p className="sres__sub">
            {loading ? 'Loading…' : `${totalFiles} files across ${resources.length} subjects`}
          </p>
        </div>
        <div className="sres__search-wrap">
          <span className="material-symbols-outlined">search</span>
          <input
            className="sres__search"
            type="text"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sres__search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="sres__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`sres__filter ${filter === f.key ? 'sres__filter--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Featured banner */}
      <AnimatePresence>
        {showFeatured && (
          <motion.div
            className="sres__featured"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sres__featured-glow" />
            <div className="sres__featured-content">
              <span className="sres__featured-label">{featured.featuredLabel}</span>
              <h3 className="sres__featured-title">{featured.subject}</h3>
              <p className="sres__featured-desc">
                {featured.files.length} new file{featured.files.length !== 1 ? 's' : ''} available for download.
              </p>
            </div>
            <button
              className="sres__featured-btn"
              onClick={() => setSearch(featured.subjectCode)}
            >
              <span className="material-symbols-outlined">folder_open</span>
              View Files
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subject grid */}
      {loading ? (
        <div className="sres__grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sres-subject-card">
              <div className="sres-subject-card__header">
                <div>
                  <div className="skeleton" style={{ height: 20, width: 48, borderRadius: 6, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 16, width: 140 }} />
                </div>
              </div>
              <div className="sres-subject-card__files">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="sres-file">
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 6 }} />
                      <div className="skeleton" style={{ height: 10, width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : gridResources.length === 0 && !showFeatured ? (
        <div className="sres__empty">
          <span className="material-symbols-outlined">folder_off</span>
          <p>No materials found</p>
        </div>
      ) : (
        <div className="sres__grid">
          <AnimatePresence>
            {gridResources.map((subject, i) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                filter={filter}
                search={search}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Verified Academic Content trust banner */}
      {!loading && (
        <div className="sres__trust">
          <span
            className="material-symbols-outlined sres__trust-icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <div>
            <div className="sres__trust-title">Verified Academic Content</div>
            <div className="sres__trust-body">
              All materials are uploaded and verified by authorized faculty members of EK-SMS.
              Content integrity is maintained by the Academic Records system.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

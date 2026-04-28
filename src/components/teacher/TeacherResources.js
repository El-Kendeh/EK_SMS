import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './TeacherResources.css';

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

const TYPE_META = {
  pdf:      { icon: 'picture_as_pdf',  label: 'PDF',       cls: 'res-type--pdf'      },
  image:    { icon: 'image',           label: 'Image',      cls: 'res-type--image'    },
  video:    { icon: 'video_file',      label: 'Video',      cls: 'res-type--video'    },
  document: { icon: 'description',     label: 'Document',   cls: 'res-type--doc'      },
  link:     { icon: 'link',            label: 'Link',       cls: 'res-type--link'     },
  other:    { icon: 'attach_file',     label: 'File',       cls: 'res-type--other'    },
};

function detectType(file) {
  if (!file) return 'other';
  if (file.type === 'application/pdf')  return 'pdf';
  if (file.type.startsWith('image/'))   return 'image';
  if (file.type.startsWith('video/'))   return 'video';
  if (file.type.includes('document') || file.type.includes('word') ||
      file.type.includes('powerpoint') || file.type.includes('presentation')) return 'document';
  return 'other';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const BLANK_FORM = {
  title: '', description: '', classId: '', inputType: 'file', url: '', file: null, resourceType: 'other',
};

export default function TeacherResources({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [resources, setResources]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showUpload, setShowUpload]     = useState(false);
  const [form, setForm]                 = useState(BLANK_FORM);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [successFlash, setSuccessFlash] = useState(false);
  const [filterClass, setFilterClass]   = useState('');
  const [filterType, setFilterType]     = useState('');
  const [search, setSearch]             = useState('');
  const [deleteId, setDeleteId]         = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    teacherApi.getResources()
      .then(data => setResources(data.resources || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`File too large — maximum 20 MB (this file is ${formatBytes(file.size)}).`);
      e.target.value = '';
      return;
    }
    setUploadError('');
    setForm(p => ({ ...p, file, resourceType: detectType(file) }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setUploadError('Title is required.'); return; }
    if (form.inputType === 'file' && !form.file) { setUploadError('Please select a file.'); return; }
    if (form.inputType === 'link' && !form.url.trim()) { setUploadError('Please enter a URL.'); return; }

    setUploadError('');
    setUploading(true);
    try {
      let res;
      if (form.inputType === 'file') {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('class_id', form.classId || '');
        fd.append('resource_type', form.resourceType);
        fd.append('file', form.file);
        res = await teacherApi.uploadResource(fd);
      } else {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('class_id', form.classId || '');
        fd.append('resource_type', 'link');
        fd.append('url', form.url.trim());
        res = await teacherApi.uploadResource(fd);
      }
      if (res.success || res.id) {
        const newResource = res.resource || {
          id: res.id || Date.now(),
          title: form.title.trim(),
          description: form.description.trim(),
          class_id: form.classId || null,
          class_name: assignedClasses.find(c => String(c.id) === String(form.classId))?.name || null,
          resource_type: form.inputType === 'link' ? 'link' : form.resourceType,
          url: form.inputType === 'link' ? form.url.trim() : res.url || null,
          file_size: form.file?.size || null,
          created_at: new Date().toISOString(),
        };
        setResources(prev => [newResource, ...prev]);
        setForm(BLANK_FORM);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUpload(false);
        setSuccessFlash(true);
        setTimeout(() => setSuccessFlash(false), 3500);
      } else {
        setUploadError(res.message || res.error || 'Upload failed — please try again.');
      }
    } catch {
      setUploadError('Network error — please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await teacherApi.deleteResource(deleteId);
      if (res.success) {
        setResources(prev => prev.filter(r => r.id !== deleteId));
        setDeleteId(null);
      }
    } catch {}
    setDeleting(false);
  };

  const filtered = resources.filter(r => {
    if (filterClass && String(r.class_id) !== String(filterClass)) return false;
    if (filterType  && r.resource_type !== filterType)              return false;
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resetUpload = () => {
    setShowUpload(false);
    setForm(BLANK_FORM);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="res-root">

      {/* Header */}
      <div className="res-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Resources</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            Upload and share learning materials with your classes
          </p>
        </div>
        <button className="tch-btn tch-btn--primary" onClick={() => setShowUpload(true)}>
          <span className="material-symbols-outlined">upload_file</span>
          Upload Resource
        </button>
      </div>

      {/* Success flash */}
      <AnimatePresence>
        {successFlash && (
          <motion.div className="res-flash"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <span className="material-symbols-outlined">check_circle</span>
            Resource uploaded successfully — students can now access it.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div className="tch-card tch-card--pad res-upload-panel"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <div className="res-upload-header">
              <p className="res-section-label">New Resource</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={resetUpload}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpload} className="res-upload-form">
              {/* Input type toggle */}
              <div>
                <label className="tch-label">Resource Type</label>
                <div className="res-type-toggle">
                  <button type="button"
                    className={`res-type-toggle__btn ${form.inputType === 'file' ? 'res-type-toggle__btn--active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, inputType: 'file', url: '' }))}>
                    <span className="material-symbols-outlined">attach_file</span>Upload File
                  </button>
                  <button type="button"
                    className={`res-type-toggle__btn ${form.inputType === 'link' ? 'res-type-toggle__btn--active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, inputType: 'link', file: null, resourceType: 'link' }))}>
                    <span className="material-symbols-outlined">link</span>Add Link
                  </button>
                </div>
              </div>

              <div className="res-upload-fields">
                <div>
                  <label className="tch-label">Title *</label>
                  <input className="tch-input" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Chapter 3 Notes — Photosynthesis" maxLength={200} />
                </div>
                <div>
                  <label className="tch-label">Class (optional)</label>
                  <select className="tch-select" value={form.classId}
                    onChange={e => setForm(p => ({ ...p, classId: e.target.value }))}>
                    <option value="">All My Classes</option>
                    {assignedClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.subject?.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="tch-label">Description (optional)</label>
                <textarea className="tch-textarea" rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this material…" maxLength={500} />
              </div>

              {form.inputType === 'file' ? (
                <div>
                  <label className="tch-label">File * (max 20 MB)</label>
                  <div className="res-file-drop" onClick={() => fileInputRef.current?.click()}>
                    <span className="material-symbols-outlined res-file-drop__icon">
                      {form.file ? 'check_circle' : 'cloud_upload'}
                    </span>
                    <p className="res-file-drop__text">
                      {form.file
                        ? <><strong>{form.file.name}</strong> · {formatBytes(form.file.size)}</>
                        : <>Click to browse — PDF, images, video, Word, PowerPoint</>
                      }
                    </p>
                    <input ref={fileInputRef} type="file" className="res-file-input"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.doc,.docx,.ppt,.pptx"
                      onChange={handleFileChange} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="tch-label">URL *</label>
                  <input className="tch-input" type="url" value={form.url}
                    onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://…" />
                </div>
              )}

              {uploadError && (
                <p className="res-form-error">
                  <span className="material-symbols-outlined">error</span>{uploadError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="tch-btn tch-btn--ghost" onClick={resetUpload}>Cancel</button>
                <button type="submit" className="tch-btn tch-btn--primary" disabled={uploading}>
                  <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload_file'}</span>
                  {uploading ? 'Uploading…' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="res-filters">
        <div className="res-search-wrap">
          <span className="material-symbols-outlined res-search-icon">search</span>
          <input className="res-search-input" placeholder="Search resources…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="tch-select res-filter-select" value={filterClass}
          onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {assignedClasses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="tch-select res-filter-select" value={filterType}
          onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {(filterClass || filterType || search) && (
          <button className="tch-btn tch-btn--ghost tch-btn--sm"
            onClick={() => { setFilterClass(''); setFilterType(''); setSearch(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Resource list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">folder_open</span>
          <p>{resources.length === 0 ? 'No resources uploaded yet' : 'No resources match your filters'}</p>
          {resources.length === 0 && (
            <button className="tch-btn tch-btn--primary" onClick={() => setShowUpload(true)}>
              Upload Your First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="res-list">
          {filtered.map((r, i) => {
            const meta = TYPE_META[r.resource_type] || TYPE_META.other;
            return (
              <motion.div key={r.id} className="tch-card res-card"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <div className={`res-card__icon ${meta.cls}`}>
                  <span className="material-symbols-outlined">{meta.icon}</span>
                </div>
                <div className="res-card__body">
                  <p className="res-card__title">{r.title}</p>
                  {r.description && <p className="res-card__desc">{r.description}</p>}
                  <div className="res-card__meta">
                    {r.class_name && (
                      <span className="tch-chip">
                        <span className="material-symbols-outlined">school</span>{r.class_name}
                      </span>
                    )}
                    <span className={`tch-chip ${meta.cls}`}>
                      <span className="material-symbols-outlined">{meta.icon}</span>{meta.label}
                    </span>
                    {r.file_size && (
                      <span className="tch-chip">
                        <span className="material-symbols-outlined">straighten</span>
                        {formatBytes(r.file_size)}
                      </span>
                    )}
                    <span className="res-card__time">{formatRelativeTime(r.created_at)}</span>
                  </div>
                </div>
                <div className="res-card__actions">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="tch-btn tch-btn--ghost tch-btn--sm"
                      title={r.resource_type === 'link' ? 'Open link' : 'Download'}>
                      <span className="material-symbols-outlined">
                        {r.resource_type === 'link' ? 'open_in_new' : 'download'}
                      </span>
                    </a>
                  )}
                  <button className="tch-btn tch-btn--ghost tch-btn--sm res-card__delete"
                    onClick={() => setDeleteId(r.id)} title="Delete resource">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="res-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteId(null)}>
            <motion.div className="res-modal tch-card tch-card--pad"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}>
              <span className="material-symbols-outlined res-modal__icon">delete_forever</span>
              <h3 className="res-modal__title">Delete Resource?</h3>
              <p className="res-modal__text">
                This resource will be removed and students will no longer be able to access it.
              </p>
              <div className="res-modal__actions">
                <button className="tch-btn tch-btn--ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="tch-btn tch-btn--danger" onClick={handleDelete} disabled={deleting}>
                  <span className="material-symbols-outlined">{deleting ? 'sync' : 'delete'}</span>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

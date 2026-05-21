import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';

/**
 * SuperadminPendingApprovals
 * Superadmin view for reviewing pending school registrations
 */
function SuperadminPendingApprovals({ onClose }) {
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    loadPendingSchools();
  }, []);

  const loadPendingSchools = async () => {
    try {
      setIsLoading(true);
      const response = await ApiClient.get('/approval/pending-schools');
      setSchools(response.data.schools || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load pending schools');
      setSchools([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchoolDetails = async (schoolId) => {
    try {
      const response = await ApiClient.get(`/approval/school-details/${schoolId}`);
      setSelectedSchool(response.data);
      setShowDetails(true);
    } catch (err) {
      setError(`Failed to load school details: ${err.message}`);
    }
  };

  const handleApprove = async (schoolId) => {
    if (!window.confirm('Approve this school registration?')) return;

    try {
      setActionInProgress(true);
      await ApiClient.post(`/approval/approve-school/${schoolId}`, {});
      
      // Refresh list
      await loadPendingSchools();
      setShowDetails(false);
      setSelectedSchool(null);
      setAction(null);
    } catch (err) {
      setError(`Approval failed: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (schoolId) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    if (!window.confirm('Reject this school registration?')) return;

    try {
      setActionInProgress(true);
      await ApiClient.post(`/approval/reject-school/${schoolId}`, {
        rejection_reason: rejectionReason,
      });

      // Refresh list
      await loadPendingSchools();
      setShowDetails(false);
      setSelectedSchool(null);
      setAction(null);
      setRejectionReason('');
    } catch (err) {
      setError(`Rejection failed: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f9fafb',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <p style={{ fontSize: 16, color: '#6b7280' }}>Loading pending schools...</p>
        </div>
      </div>
    );
  }

  // Details view
  if (showDetails && selectedSchool) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f9fafb',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Back button */}
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedSchool(null);
              setAction(null);
              setRejectionReason('');
            }}
            style={{
              marginBottom: 24,
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            ← Back to List
          </button>

          {/* School details card */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 24,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 32,
            }}>
              {/* School info */}
              <div>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#111827',
                  margin: '0 0 24px',
                }}>
                  School Details
                </h2>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    INSTITUTION NAME
                  </p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                    {selectedSchool.school?.name || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    SCHOOL EMAIL
                  </p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1B3FAF' }}>
                    {selectedSchool.school?.email || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    ADDRESS
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {selectedSchool.school?.address || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    CITY / COUNTRY
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {selectedSchool.school?.city}, {selectedSchool.school?.country}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    PHONE
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {selectedSchool.school?.phone || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    SUBMITTED
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {new Date(selectedSchool.school?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Admin info */}
              <div>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#111827',
                  margin: '0 0 24px',
                }}>
                  Administrator Details
                </h2>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    FULL NAME
                  </p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                    {selectedSchool.admin?.first_name} {selectedSchool.admin?.last_name}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    USERNAME
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {selectedSchool.admin?.username || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    EMAIL
                  </p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1B3FAF' }}>
                    {selectedSchool.admin?.email || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                    PHONE
                  </p>
                  <p style={{ margin: 0, fontSize: 16, color: '#111827' }}>
                    {selectedSchool.admin?.phone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                marginTop: 24,
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: 12,
                color: '#dc2626',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Action section */}
          {!action && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}>
              <button
                onClick={() => handleApprove(selectedSchool.school?.id)}
                disabled={actionInProgress}
                style={{
                  padding: '16px 24px',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  opacity: actionInProgress ? 0.6 : 1,
                }}
              >
                {actionInProgress ? 'Processing...' : '✓ Approve'}
              </button>
              <button
                onClick={() => setAction('reject')}
                style={{
                  padding: '16px 24px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                ✕ Reject
              </button>
            </div>
          )}

          {/* Rejection reason form */}
          {action === 'reject' && (
            <div style={{
              background: '#fee2e2',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#dc2626',
                margin: '0 0 12px',
              }}>
                Provide Rejection Reason
              </h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this registration is being rejected..."
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 12,
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => {
                    setAction(null);
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedSchool.school?.id)}
                  disabled={actionInProgress || !rejectionReason.trim()}
                  style={{
                    padding: '12px 24px',
                    background: actionInProgress || !rejectionReason.trim() ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: actionInProgress || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionInProgress ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#111827',
              margin: 0,
            }}>
              Pending Approvals
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '8px 0 0',
            }}>
              {schools.length} school{schools.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            ← Back
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Schools list */}
        {schools.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              All Caught Up!
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              No pending schools awaiting approval.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: 16,
          }}>
            {schools.map((school) => (
              <div
                key={school.id}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                    margin: '0 0 8px',
                  }}>
                    {school.name}
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    fontSize: 14,
                    color: '#6b7280',
                  }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Admin:</span> {school.admin_name}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Email:</span> {school.email}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>City:</span> {school.city}, {school.country}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Submitted:</span>{' '}
                      {new Date(school.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => loadSchoolDetails(school.id)}
                  style={{
                    padding: '12px 24px',
                    background: '#1B3FAF',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperadminPendingApprovals;

import React from 'react';

/**
 * ApprovalStatusModal
 * Displays school approval status to users
 */
function ApprovalStatusModal({ status, schoolName, submittedAt, rejectionReason, onLogout }) {
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';

  const getIcon = () => {
    if (isApproved) return '✅';
    if (isRejected) return '⚠️';
    return '⏳';
  };

  const getTitle = () => {
    if (isApproved) return 'School Approved!';
    if (isRejected) return 'Registration Not Approved';
    return 'Registration Under Review';
  };

  const getColor = () => {
    if (isApproved) return '#1B3FAF';
    if (isRejected) return '#dc2626';
    return '#d97706';
  };

  const getBgColor = () => {
    if (isApproved) return '#dcfce7';
    if (isRejected) return '#fee2e2';
    return '#fef3c7';
  };

  const formattedDate = submittedAt ? new Date(submittedAt).toLocaleDateString() : 'N/A';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B3FAF 0%, #0f2c7d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '48px 32px',
        maxWidth: 500,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: getBgColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 40,
        }}>
          {getIcon()}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          color: getColor(),
          margin: '0 0 16px',
        }}>
          {getTitle()}
        </h2>

        {/* School name */}
        <p style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 24px',
        }}>
          {schoolName}
        </p>

        {/* Message */}
        {isPending && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <p style={{
              margin: 0,
              color: '#78350f',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              Your application is currently under review by our team. You'll receive an email at your registered email address once a decision has been made.
            </p>
            <p style={{
              margin: '12px 0 0',
              fontSize: 12,
              color: '#92400e',
            }}>
              <strong>Submitted:</strong> {formattedDate}
            </p>
          </div>
        )}

        {isRejected && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <p style={{
              margin: '0 0 12px',
              color: '#7f1d1d',
              fontSize: 14,
              fontWeight: 600,
            }}>
              Reason for Rejection:
            </p>
            <p style={{
              margin: 0,
              color: '#7f1d1d',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              {rejectionReason || 'No reason provided'}
            </p>
            <p style={{
              margin: '12px 0 0',
              fontSize: 12,
              color: '#991b1b',
            }}>
              For assistance, please contact support at <strong>support@pruhsms.africa</strong>
            </p>
          </div>
        )}

        {isApproved && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <p style={{
              margin: '0 0 12px',
              color: '#1e40af',
              fontSize: 14,
              fontWeight: 600,
            }}>
              ✨ Your school is now active!
            </p>
            <p style={{
              margin: 0,
              color: '#1e40af',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              You can now sign in and access your school's dashboard. Sign in with your credentials to get started.
            </p>
          </div>
        )}

        {/* Steps indicator (pending only) */}
        {isPending && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { icon: '✓', label: 'Application Submitted', done: true },
              { icon: '👀', label: 'Under Review', done: false },
              { icon: '🔓', label: 'Dashboard Access', done: false },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: step.done ? '#dcfce7' : '#f3f4f6',
                  border: `1px solid ${step.done ? 'rgba(74,222,128,0.2)' : '#e5e7eb'}`,
                }}
              >
                <span style={{
                  fontSize: 16,
                  color: step.done ? '#16a34a' : '#6b7280',
                }}>
                  {step.done ? '✓' : '○'}
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: step.done ? '#16a34a' : '#6b7280',
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '14px 28px',
            background: '#f3f4f6',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#e5e7eb';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#f3f4f6';
          }}
        >
          Sign Out
        </button>

        {isRejected && (
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '14px 28px',
              background: '#1B3FAF',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
}

export default ApprovalStatusModal;

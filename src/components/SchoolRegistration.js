import React, { useState } from 'react';
import './Register.css';
import ApiClient from '../api/client';
import PruhLogo from './PruhLogo';

/* Registration Steps:
   1. School Info
   2. Admin Info
   3. Email Verification (OTP)
   4. Success
*/

function SchoolRegistration({ onNavigate }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: School Info
    institutionName: '',
    institutionType: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    capacity: '',
    website: '',
    region: '',
    academicSystem: '',
    
    // Step 2: Admin Info
    firstName: '',
    lastName: '',
    adminUsername: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [badge, setBadge] = useState(null);
  const [badgePreview, setBadgePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false); // eslint-disable-line no-unused-vars
  const [otpError, setOtpError] = useState('');
  const [registrationData, setRegistrationData] = useState(null); // eslint-disable-line no-unused-vars
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Handle file upload
  const handleBadgeChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setBadge(file);
      const reader = new FileReader();
      reader.onload = (evt) => setBadgePreview(evt.target?.result);
      reader.readAsDataURL(file);
    }
  };

  // Validate Step 1
  const validateStep1 = () => {
    const required = ['institutionName', 'institutionType', 'address', 'city', 'country', 'phone', 'email'];
    for (const field of required) {
      if (!formData[field]?.trim()) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return false;
      }
    }
    if (!formData.email.includes('@')) {
      setError('Enter a valid email');
      return false;
    }
    return true;
  };

  // Validate Step 2
  const validateStep2 = () => {
    const required = ['firstName', 'lastName', 'adminUsername', 'adminEmail', 'password'];
    for (const field of required) {
      if (!formData[field]?.trim()) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return false;
      }
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.adminEmail.includes('@')) {
      setError('Enter a valid admin email');
      return false;
    }
    return true;
  };

  // Move to next step
  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 2) {
      // Send OTP before moving to step 3
      sendOtp();
    } else {
      setStep(step + 1);
    }
  };

  // Send OTP
  const sendOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      await ApiClient.post('/auth/send-otp/', { email: formData.adminEmail });
      setOtpSent(true);
      setStep(3);
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and register
  const verifyAndRegister = async () => {
    if (!otp.trim()) {
      setOtpError('Enter the OTP');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    
    try {
      // Verify OTP first
      await ApiClient.post('/auth/verify-otp/', {
        email: formData.adminEmail,
        code: otp,
      });

      // Then submit registration
      const formDataObj = new FormData();
      formDataObj.append('institutionName', formData.institutionName);
      formDataObj.append('institutionType', formData.institutionType);
      formDataObj.append('address', formData.address);
      formDataObj.append('city', formData.city);
      formDataObj.append('country', formData.country);
      formDataObj.append('region', formData.region);
      formDataObj.append('phone', formData.phone);
      formDataObj.append('email', formData.email);
      formDataObj.append('capacity', formData.capacity);
      formDataObj.append('website', formData.website);
      formDataObj.append('academicSystem', formData.academicSystem);
      
      formDataObj.append('firstName', formData.firstName);
      formDataObj.append('lastName', formData.lastName);
      formDataObj.append('adminUsername', formData.adminUsername);
      formDataObj.append('adminEmail', formData.adminEmail);
      formDataObj.append('adminPhone', formData.adminPhone);
      formDataObj.append('password', formData.password);

      if (badge) {
        formDataObj.append('schoolBadge', badge);
      }

      const response = await ApiClient.post(
        '/registration/register-school-admin',
        formDataObj,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setRegistrationData(response.data);
      setShowSuccess(true);
      setStep(4);
    } catch (err) {
      setOtpError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const prevStep = () => {
    if (step === 3) {
      setOtpSent(false);
      setOtp('');
      setOtpError('');
    }
    setStep(Math.max(1, step - 1));
  };

  // Success screen
  if (showSuccess && step === 4) {
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
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 40,
          }}>
            ✅
          </div>
          <h2 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 12px',
          }}>
            Registration Submitted!
          </h2>
          <p style={{
            fontSize: 16,
            color: '#4b5563',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}>
            Thank you for registering <strong>{formData.institutionName}</strong>. Your application has been received and is under review by our team.
          </p>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            textAlign: 'center',
          }}>
            <p style={{
              margin: '0 0 8px',
              color: '#92400e',
              fontWeight: 600,
            }}>
              📧 Confirmation Email Sent
            </p>
            <p style={{
              margin: 0,
              fontSize: 14,
              color: '#b45309',
            }}>
              Check <strong>{formData.adminEmail}</strong> for updates on your registration.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('login')}
            style={{
              background: '#1B3FAF',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Main registration form
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
        padding: '40px 32px',
        maxWidth: 600,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <PruhLogo />
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#111827',
            margin: '16px 0 0',
          }}>
            Register Your School
          </h1>
          <p style={{
            color: '#6b7280',
            margin: '8px 0 0',
            fontSize: 14,
          }}>
            Step {step} of {step < 3 ? 2 : 3}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 32,
        }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                background: s <= step ? '#1B3FAF' : '#e5e7eb',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {(error || otpError) && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
            color: '#dc2626',
            fontSize: 14,
            display: 'flex',
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>{error || otpError}</span>
          </div>
        )}

        {/* Step 1: School Info */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Institution Name *
              </label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={(e) => handleChange('institutionName', e.target.value)}
                placeholder="e.g., Springfield High School"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Institution Type *
              </label>
              <select
                value={formData.institutionType}
                onChange={(e) => handleChange('institutionType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select type</option>
                <option value="primary">Primary School</option>
                <option value="secondary">Secondary School</option>
                <option value="tertiary">Tertiary Institution</option>
                <option value="vocational">Vocational School</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street address"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select country</option>
                  <option value="Sierra Leone">Sierra Leone</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+232 ..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="school@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                School Badge (Optional)
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                cursor: 'pointer',
                background: badgePreview ? '#f3f4f6' : '#fafafa',
              }}>
                {badgePreview ? (
                  <div>
                    <img src={badgePreview} alt="Badge preview" style={{ maxHeight: 80, maxWidth: '100%' }} />
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                      <label style={{ cursor: 'pointer', color: '#1B3FAF' }}>
                        Change
                        <input type="file" accept="image/*" onChange={handleBadgeChange} style={{ display: 'none' }} />
                      </label>
                    </p>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
                      Click to upload school badge
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                      PNG, JPG, GIF or WebP (max 5MB)
                    </p>
                    <input type="file" accept="image/*" onChange={handleBadgeChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Admin Info */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Username *
              </label>
              <input
                type="text"
                value={formData.adminUsername}
                onChange={(e) => handleChange('adminUsername', e.target.value)}
                placeholder="johnDoe123"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Email *
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => handleChange('adminEmail', e.target.value)}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Min 8 characters"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Must contain: letters, numbers, and at least 8 characters
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* Step 3: OTP Verification */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                Verify Your Email
              </h3>
              <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>
                We've sent a verification code to <strong>{formData.adminEmail}</strong>
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, color: '#111827', textAlign: 'left' }}>
                Enter Verification Code *
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #1B3FAF',
                  borderRadius: 8,
                  fontSize: 24,
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={() => sendOtp()}
              disabled={isLoading}
              style={{
                background: 'transparent',
                color: '#1B3FAF',
                border: 'none',
                padding: '8px 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
                textDecoration: 'underline',
              }}
            >
              {isLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        )}

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 32,
        }}>
          {step > 1 && (
            <button
              onClick={prevStep}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '14px 28px',
                border: '1px solid #d1d5db',
                background: 'white',
                borderRadius: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 16,
                color: '#111827',
              }}
            >
              Back
            </button>
          )}
          
          <button
            onClick={step === 3 ? verifyAndRegister : nextStep}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '14px 28px',
              background: isLoading ? '#9ca3af' : '#1B3FAF',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 16,
            }}
          >
            {isLoading ? 'Processing...' : (step === 3 ? 'Register' : 'Next')}
          </button>
        </div>

        {/* Login link */}
        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 14,
          color: '#6b7280',
        }}>
          Already registered?{' '}
          <button
            onClick={() => onNavigate?.('login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1B3FAF',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default SchoolRegistration;

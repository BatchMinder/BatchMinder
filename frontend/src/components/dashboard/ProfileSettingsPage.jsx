import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Phone, Mail, Upload, Trash2, Shield, Save, CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuth();
  const { showConfirm, showSuccess } = useModal();
  const fileInputRef = useRef(null);

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [deletingPic, setDeletingPic] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [picError, setPicError] = useState('');

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPicError('');

    // Client-side validations
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      setPicError('Invalid file format. Only JPG, PNG, and WEBP are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPicError('File is too large. Maximum size allowed is 5MB.');
      return;
    }

    // Submit image
    const formData = new FormData();
    formData.append('profilePicture', file);

    setUploadingPic(true);
    try {
      const response = await fetch('/api/users/me/profile-picture', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        updateUser(data.data);
      } else {
        setPicError(data.message || 'Failed to upload profile picture.');
      }
    } catch (err) {
      setPicError('Connection issue: Could not upload photo to server.');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleDeletePhoto = async () => {
    const confirmed = await showConfirm(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      'Remove',
      'Cancel',
      '#EF4444'
    );
    if (!confirmed) return;

    setPicError('');
    setDeletingPic(true);
    try {
      const response = await fetch('/api/users/me/profile-picture', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        updateUser(data.data);
        showSuccess('Profile picture removed successfully.');
      } else {
        setPicError(data.message || 'Failed to remove profile picture.');
      }
    } catch (err) {
      setPicError('Connection issue: Could not delete photo.');
    } finally {
      setDeletingPic(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name field cannot be empty.');
      return;
    }
    if (!email.trim()) {
      setProfileError('Email field cannot be empty.');
      return;
    }

    const payload = { name, email, phone };

    if (newPassword) {
      if (!currentPassword) {
        setProfileError('Current password is required to change password.');
        return;
      }
      if (newPassword.length < 6) {
        setProfileError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError('Confirm password does not match new password.');
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    setSavingProfile(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        updateUser(data.data);
        setProfileSuccess('Profile settings successfully updated.');
        showSuccess('Profile settings successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setProfileSuccess(''), 4000);
      } else {
        setProfileError(data.message || 'Failed to update profile settings.');
      }
    } catch (err) {
      setProfileError('Connection issue: Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = user?.name?.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC', padding: '32px', fontFamily: 'inherit' }}>
      
      {/* Header Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
          Profile Settings
        </h1>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
          Manage your personal details, profile image, and credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-7 items-start">
        
        {/* Left Card: Profile Image */}
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '16px', padding: '24px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', textAlign: 'left' }}>
            Profile Picture
          </h3>

          <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                fontSize: '36px', fontWeight: 700, color: '#FFFFFF'
              }}>
                {initials}
              </div>
            )}

            {(uploadingPic || deletingPic) && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <RefreshCw size={24} color="#FFF" className="animate-spin" />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              disabled={uploadingPic || deletingPic}
              onClick={triggerFileSelect}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '9px 14px', borderRadius: '8px', border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF', fontSize: '12px', fontWeight: 700, color: '#334155',
                cursor: (uploadingPic || deletingPic) ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >
              <Upload size={14} />
              Upload Photo
            </button>

            {user?.profilePictureUrl && (
              <button
                type="button"
                disabled={uploadingPic || deletingPic}
                onClick={handleDeletePhoto}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '9px 14px', borderRadius: '8px', border: '1px solid #FCA5A5',
                  backgroundColor: '#FEF2F2', fontSize: '12px', fontWeight: 700, color: '#DC2626',
                  cursor: (uploadingPic || deletingPic) ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                <Trash2 size={14} />
                Remove Photo
              </button>
            )}
          </div>

          <p style={{ margin: '14px 0 0', fontSize: '11px', color: '#94A3B8', lineHeight: '1.4' }}>
            Allowed formats: JPG, PNG, WEBP. Max size 5MB.
          </p>

          {picError && (
            <div style={{
              marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
              backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
              display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left'
            }}>
              <AlertCircle size={14} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#B91C1C' }}>{picError}</span>
            </div>
          )}
        </div>

        {/* Right Card: Personal Info fields */}
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '16px', padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
            Account Details
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Name Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                    backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Email Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                    backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                    backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Section Divider */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '18px', marginTop: '4px' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Change Password
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '11.5px', color: '#94A3B8' }}>
                Fill these fields only if you wish to change your account password.
              </p>
            </div>

            {/* Current Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                    backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                      border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                      backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                      border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none',
                      backgroundColor: '#FFFFFF', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Role & Status (Disabled informational fields) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>System Role</label>
                <div style={{
                  padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC', fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <Shield size={14} color="#94A3B8" />
                  {user?.role === 'super_admin' ? 'Super Admin' :
                   user?.role === 'academic_admin' ? 'Administrator' :
                   user?.role === 'admin' ? 'HOD' :
                   user?.role === 'advisor' ? 'Batch Advisor' : (user?.role || 'Administrator')}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>Account Status</label>
                <div style={{
                  padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC', fontSize: '13px', color: '#10B981', fontWeight: 700
                }}>
                  ● {user?.status || 'Active'}
                </div>
              </div>
            </div>

            {/* Feedback Notifications */}
            {profileError && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <AlertCircle size={16} color="#DC2626" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#B91C1C' }}>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <CheckCircle2 size={16} color="#059669" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>{profileSuccess}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#2563EB', fontSize: '13px', fontWeight: 700, color: '#FFFFFF',
                  cursor: savingProfile ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => { if (!savingProfile) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
                onMouseLeave={e => { if (!savingProfile) e.currentTarget.style.backgroundColor = '#2563EB'; }}
              >
                {savingProfile ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Settings
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}

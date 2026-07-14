import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null); // { title, message, type: 'alert'|'confirm', onConfirm, onCancel, confirmText, cancelText, confirmColor }
  const [toastMessage, setToastMessage] = useState(null);

  const showSuccess = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const showAlert = (title, message) => {
    return new Promise((resolve) => {
      setModalConfig({
        title,
        message,
        type: 'alert',
        confirmText: 'OK',
        confirmColor: '#1B3A6B',
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        }
      });
    });
  };

  const showConfirm = (title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = '#EF4444') => {
    return new Promise((resolve) => {
      setModalConfig({
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        confirmColor,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      showAlert('Notification', String(message));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showSuccess }}>
      {children}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#10B981',
          color: '#ffffff',
          textAlign: 'center',
          padding: '12px 24px',
          fontSize: '13.5px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          zIndex: 10005,
          boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}
      {modalConfig && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 400, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1B3A6B' }}>
              {modalConfig.title}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748B', lineHeight: '1.5' }}>
              {modalConfig.message}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {modalConfig.type === 'confirm' && (
                <button
                  onClick={modalConfig.onCancel}
                  style={{
                    padding: '8px 20px', borderRadius: 12, border: '1px solid #E2E8F0',
                    backgroundColor: '#fff', color: '#64748B', fontWeight: 600,
                    cursor: 'pointer', fontSize: 14, outline: 'none'
                  }}
                >
                  {modalConfig.cancelText}
                </button>
              )}
              <button
                onClick={modalConfig.onConfirm}
                style={{
                  padding: '8px 20px', borderRadius: 12, border: 'none',
                  backgroundColor: modalConfig.confirmColor, color: '#fff', fontWeight: 600,
                  cursor: 'pointer', fontSize: 14, outline: 'none'
                }}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

import React from 'react';

export default function Footer() {
  return (
    <footer
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 23.99px 24px 24px',
        width: '100%',
        height: '73px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #C4C6CC',
        flex: 'none',
        order: 1,
        alignSelf: 'stretch',
        flexGrow: 0,
      }}
      className="font-sans shrink-0 select-none z-20"
    >
      {/* Container - Left */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '0px',
          width: '96.91px',
          height: '24px',
          flex: 'none',
          order: 0,
          flexGrow: 0,
        }}
      >
        <span
          style={{
            width: '96.91px',
            height: '24px',
            fontFamily: "'Liberation Sans', -apple-system, sans-serif",
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '16px',
            lineHeight: '24px',
            display: 'flex',
            alignItems: 'center',
            color: '#0D1B2A',
            flex: 'none',
            order: 0,
            flexGrow: 0,
          }}
        >
          BatchMinder
        </span>
      </div>

      {/* Container - Center */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '0px',
          width: '516.94px',
          height: '24px',
          flex: 'none',
          order: 1,
          flexGrow: 0,
        }}
        className="hidden md:flex"
      >
        <span
          style={{
            width: '516.94px',
            height: '24px',
            fontFamily: "'Liberation Sans', -apple-system, sans-serif",
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '24px',
            display: 'flex',
            alignItems: 'center',
            color: '#44474C',
            flex: 'none',
            order: 0,
            flexGrow: 0,
          }}
        >
          &copy; 2026 BatchMinder Academic Management Portal. All Rights Reserved.
        </span>
      </div>

      {/* Container - Right */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: '0px',
          gap: '23.99px',
          width: '205.87px',
          height: '15px',
          flex: 'none',
          order: 2,
          flexGrow: 0,
        }}
      >
        {/* Link - Security Policy */}
        <a
          href="#security"
          style={{
            width: '86.05px',
            height: '15px',
            fontFamily: "'Liberation Sans', -apple-system, sans-serif",
            fontStyle: 'normal',
            fontWeight: 600,
            fontSize: '12px',
            lineHeight: '14px',
            display: 'flex',
            alignItems: 'center',
            color: '#44474C',
            flex: 'none',
            order: 0,
            alignSelf: 'stretch',
            flexGrow: 0,
            textDecoration: 'none',
          }}
          className="hover:text-slate-800 transition-colors"
        >
          Security Policy
        </a>

        {/* Link - Terms of Service */}
        <a
          href="#terms"
          style={{
            width: '95.83px',
            height: '15px',
            fontFamily: "'Liberation Sans', -apple-system, sans-serif",
            fontStyle: 'normal',
            fontWeight: 600,
            fontSize: '12px',
            lineHeight: '14px',
            display: 'flex',
            alignItems: 'center',
            color: '#44474C',
            flex: 'none',
            order: 1,
            alignSelf: 'stretch',
            flexGrow: 0,
            textDecoration: 'none',
          }}
          className="hover:text-slate-800 transition-colors"
        >
          Terms of Service
        </a>
      </div>
    </footer>
  );
}

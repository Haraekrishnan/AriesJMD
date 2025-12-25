
'use client';
import React from 'react';
import './diwali.css';

export default function DiwaliDecoration() {
  return (
    <div className="diwali-container">
      <div className="happy-diwali">
        <h1>Happy Diwali</h1>
      </div>
      <div className="diya-container">
        <div className="diya">
          <div className="flame"></div>
        </div>
        <div className="diya">
          <div className="flame"></div>
        </div>
        <div className="diya">
          <div className="flame"></div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

const Toast = ({ toast }) => {
  return (
    <div className={`toast ${toast.visible ? 'visible' : ''}`}>
      {toast.message}
    </div>
  );
};

export default Toast;

import React, { useState, useEffect } from 'react';
import './TrollPopup.css';

const TrollPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: '20%', left: '30%' });
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    // Show popup after a short delay when component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleOkClick = () => {
    setClickCount(prev => prev + 1);
    
    // Generate random position for the popup
    const newTop = Math.random() * 70 + 10; // 10% to 80%
    const newLeft = Math.random() * 70 + 10; // 10% to 80%
    
    setPosition({
      top: `${newTop}%`,
      left: `${newLeft}%`
    });

    // Add some variety to the movement
    if (clickCount > 3) {
      // Make it bounce around more aggressively
      setTimeout(() => {
        const bounceTop = Math.random() * 60 + 15;
        const bounceLeft = Math.random() * 60 + 15;
        setPosition({
          top: `${bounceTop}%`,
          left: `${bounceLeft}%`
        });
      }, 200);
    }
  };

  const handleCloseClick = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="troll-popup-overlay">
      <div 
        className="troll-popup-window"
        style={{
          top: position.top,
          left: position.left,
          transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
      >
        {/* Window Title Bar */}
        <div className="troll-popup-title-bar">
          <div className="troll-popup-title">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgIWVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYW" alt="Warning" className="troll-icon" />
            Survey Request
          </div>
          <button 
            className="troll-close-btn"
            onClick={handleCloseClick}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Window Content */}
        <div className="troll-popup-content">
          <div className="troll-message-area">
            <div className="troll-icon-area">
              <div className="troll-warning-icon">⚠️</div>
            </div>
            <div className="troll-message-text">
              Would you like to participate in our satisfaction survey with a <strong>1,000,000 $GOAT</strong> reward?
              {clickCount > 2 && (
                <div className="troll-extra-text">
                  <br />
                  <small>Come on, just click close! 😏</small>
                </div>
              )}
              {clickCount > 5 && (
                <div className="troll-extra-text">
                  <br />
                  <small style={{ color: '#ff4757' }}>You really want those tokens, don't you? 😂</small>
                </div>
              )}
            </div>
          </div>
          
          <div className="troll-button-area">
            <button 
              className="troll-ok-btn"
              onClick={handleOkClick}
            >
              OK
            </button>
            <button 
              className="troll-cancel-btn"
              onClick={handleCloseClick}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrollPopup;
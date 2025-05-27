import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import FlappyGame from './FlappyGame'; // Import FlappyGame component
import RockPaperScissors from './RockPaperScissors'; // Import RockPaperScissors component
// Import the background image
import backgroundImage from './colosseum.jpg';

function App() {
  const [characterIndex, setCharacterIndex] = useState(0);
  const [confettiElements, setConfettiElements] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [chartButtonPosition, setChartButtonPosition] = useState({ top: 51, left: 51 });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showPlayButton, setShowPlayButton] = useState(false); // To control the Easter egg button
  const [showFlappyGame, setShowFlappyGame] = useState(false); // To show Flappy Bird game
  const [showRockPaperScissors, setShowRockPaperScissors] = useState(false); // For Rock-Paper-Scissors
  const [showRPSButton, setShowRPSButton] = useState(true); // To control RPS button
  const [isMobile, setIsMobile] = useState(false); // For mobile device detection
  const prevCharacterIndex = useRef(0);
  const hasShownConfetti = useRef(false);
  const audioRef = useRef(null);
  
  // Mobile device detection
  useEffect(() => {
    const checkMobile = () => {
      const mobileCheck = window.innerWidth <= 768;
      setIsMobile(mobileCheck);
    };
    
    // Check on initial load and size changes
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Show RPS button as soon as the site opens
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRPSButton(true);
    }, 1500); // Visible after 1.5 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Character images from public folder
  const characterImages = [
    process.env.PUBLIC_URL + '/character1.png', 
    process.env.PUBLIC_URL + '/character2.png', 
    process.env.PUBLIC_URL + '/character3.png'
  ];
  
  // Confetti PNG image and sound effect
  const confettiImage = process.env.PUBLIC_URL + '/confetti.png';
  const soundEffect = process.env.PUBLIC_URL + '/JDMN.mp3';
  
  // Chart button movement - Move slower on mobile devices
  useEffect(() => {
    if (showChart) return; // Don't move if chart is visible
    
    // Button starts at a random position
    setChartButtonPosition({
      top: Math.random() * 90,
      left: Math.random() * 90
    });
    
    // Initial velocity (relatively slow) - Slower on mobile devices
    const velocityFactor = isMobile ? 0.5 : 1;
    let vx = (0.05 + Math.random() * 0.05) * velocityFactor;
    let vy = (0.04 + Math.random() * 0.04) * velocityFactor;
    
    // Direction (1 or -1)
    let dx = Math.random() > 0.5 ? 1 : -1;
    let dy = Math.random() > 0.5 ? 1 : -1;
    
    // Set up the interval for smooth movement
    const moveInterval = setInterval(() => {
      setChartButtonPosition(prev => {
        // Calculate new position
        let newLeft = prev.left + vx * dx;
        let newTop = prev.top + vy * dy;
        
        // Check boundaries and bounce
        if (newLeft <= 0 || newLeft >= 90) {
          dx *= -1;
          newLeft = Math.max(0, Math.min(90, newLeft));
        }
        
        if (newTop <= 0 || newTop >= 90) {
          dy *= -1;
          newTop = Math.max(0, Math.min(90, newTop));
        }
        
        return { top: newTop, left: newLeft };
      });
    }, 20); // Update every 20ms for smoothness
    
    // Clean up
    return () => clearInterval(moveInterval);
  }, [showChart, isMobile]);
  
  // Generate confetti elements only once
  useEffect(() => {
    // Pre-generate confetti elements with fixed positions and properties
    const elements = [...Array(100)].map((_, i) => (
      <div 
        key={i} 
        className="confetti" 
        style={{
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 3 + 2}s`,
          animationDelay: `${Math.random() * 0.5}s`,
          backgroundImage: `url(${confettiImage})`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
      />
    ));
    setConfettiElements(elements);
  }, [confettiImage]);
  
  // Show confetti and play sound when character3 appears
  useEffect(() => {
    // Check if we need to show confetti and play sound
    const shouldShowEffects = characterIndex === 2 && 
                             prevCharacterIndex.current !== 2 && 
                             !hasShownConfetti.current && 
                             confettiElements;
    
    if (shouldShowEffects) {
      console.log("Showing confetti and playing sound");
      const confettiContainer = document.querySelector('.confetti-container');
      if (confettiContainer) {
        confettiContainer.style.display = 'block';
        hasShownConfetti.current = true;
        
        // Play sound effect - Create a new Audio instance
        try {
          const audio = new Audio(soundEffect);
          audio.volume = volume / 100;
          audioRef.current = audio;
          
          // Show volume slider and Play button (Easter egg)
          setShowVolumeSlider(true);
          setShowPlayButton(true); // Show Easter egg button
          
          // Play the sound immediately
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('Audio started successfully');
            }).catch(e => {
              console.log('Audio playback was prevented by the browser:', e);
              // There may be autoplay restrictions on mobile devices
              // We can try to play sound after user interaction
              setShowVolumeSlider(true);
              setShowPlayButton(true);
            });
          }
          
          // Hide volume slider and confetti after audio ends
          audio.addEventListener('ended', () => {
            setShowVolumeSlider(false);
            confettiContainer.style.display = 'none';
            // Play button will be shown permanently
          });
        } catch (error) {
          console.error("Error playing sound:", error);
          // Still show buttons in case of sound playback error
          setShowVolumeSlider(true);
          setShowPlayButton(true);
        }
        
        // Hide confetti after animation completes (backup if audio doesn't end)
        setTimeout(() => {
          confettiContainer.style.display = 'none';
        }, 4000);
      }
    }
    
    prevCharacterIndex.current = characterIndex;
  }, [characterIndex, confettiElements, soundEffect, volume]);
  
  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    
    // Update audio volume if audio is playing
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };
  
  const handleCharacterClick = () => {
    setCharacterIndex((prevIndex) => (prevIndex + 1) % 3);
  };

  const handleBuyClick = () => {
    window.open("https://arenabook.xyz/token/0xB9C188BC558a82a1eE9E75AE0857df443F407632", "_blank");
  };
  
  const handleChartClick = () => {
    setShowChart(true);
  };
  
  const handleCloseChart = () => {
    setShowChart(false);
  };
  
  // Play button (Easter egg) click handler
  const handlePlayClick = () => {
    setShowFlappyGame(true);
  };

  // RPS button click handler
  const handleRPSClick = () => {
    setShowRockPaperScissors(true);
  };
  
  // Close Flappy Bird game
  const handleCloseFlappyGame = () => {
    setShowFlappyGame(false);
  };

  // Close Rock-Paper-Scissors game
  const handleCloseRockPaperScissors = () => {
    setShowRockPaperScissors(false);
  };
  
  // Touch event handlers for mobile devices
  const handleTouchStart = (e) => {
    // Prevent default touch behavior for chart button
    if (e.target.className === 'chart-button') {
      e.preventDefault();
    }
  };
  
  return (
    <div className="App" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="confetti-container" style={{ display: 'none' }}>
        {confettiElements}
      </div>
      
      {/* RPS Button - Physically above the image */}
      {showRPSButton && (
        <img 
          src={process.env.PUBLIC_URL + '/rps-button.webp'}
          alt="Rock Paper Scissors"
          className="rps-button-top"
          onClick={handleRPSClick}
        />
      )}
      
      <div className="character-container" onClick={handleCharacterClick}>
        <div className="character-frame">
          <img 
            src={characterImages[characterIndex]} 
            alt="Character" 
            className="character-image"
          />
        </div>
      </div>
      
      {/* Volume Slider */}
      {showVolumeSlider && (
        <div className="volume-slider-container">
          <div className="volume-slider-label">Volume</div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <div className="volume-value">{volume}%</div>
        </div>
      )}
      
      <button className="buy-button" onClick={handleBuyClick}>
        Buy
      </button>
      
      {/* Easter Egg Play Button */}
      {showPlayButton && (
        <button className="play-button" onClick={handlePlayClick}>
          🐦 Play
        </button>
      )}
      
      {/* Moving Chart Button - special touch event handler on mobile devices */}
      <button 
        className="chart-button" 
        style={{ 
          position: 'absolute',
          top: `${chartButtonPosition.top}%`,
          left: `${chartButtonPosition.left}%`
        }}
        onClick={handleChartClick}
        onTouchStart={handleTouchStart}
      >
        CHART
      </button>
      
      {/* Chart Modal */}
      {showChart && (
        <div className="chart-modal">
          <div className="chart-modal-content">
            <button className="close-button" onClick={handleCloseChart}>X</button>
            <iframe
              src="https://dexscreener.com/avalanche/0xB9C188BC558a82a1eE9E75AE0857df443F407632?embed=1"
              frameBorder="0"
              width="100%"
              height="100%"
              allowTransparency="true"
              style={{ border: 'none' }}
              title="DexScreener Chart"
            ></iframe>
          </div>
        </div>
      )}
      
      {/* Flappy Bird Game Modal */}
      {showFlappyGame && (
        <FlappyGame onClose={handleCloseFlappyGame} />
      )}

      {/* Rock-Paper-Scissors Game Modal */}
      {showRockPaperScissors && (
        <RockPaperScissors onClose={handleCloseRockPaperScissors} />
      )}
      
      {/* Disclaimer at bottom */}
      <div className="disclaimer">
        For entertainment purposes only.{' '}
        <a 
          href="https://arena.social/Eelvanpsd" 
          target="_blank"
          rel="noopener noreferrer"
          className="twitter-link"
        >
          @Eelvanpsd
        </a>
      </div>
    </div>
  );
}

export default App;
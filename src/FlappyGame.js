import React, { useEffect, useRef, useState, useCallback } from 'react';
import './FlappyGame.css';

const FlappyGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // References
  const lastTimeRef = useRef(0);
  const pipeSpeedRef = useRef(150);
  const groundSpeedRef = useRef(150);
  const bgSpeedRef = useRef(50);
  const pipeSpawnTimeRef = useRef(0);
  const PIPE_SPAWN_INTERVAL = 2.0;
  const imagesRef = useRef({
    bird: null,
    pipeTop: null,
    pipeBottom: null, 
    background: null,
    ground: null
  });
  const imageLoadCountRef = useRef(0);
  
  // For preloading images
  useEffect(() => {
    const totalImages = 5; // Total number of images to load
    const imageSources = {
      bird: process.env.PUBLIC_URL + '/Flappy.png',
      pipeTop: process.env.PUBLIC_URL + '/pipe-top.png',
      pipeBottom: process.env.PUBLIC_URL + '/pipe-bottom.png',
      background: process.env.PUBLIC_URL + '/flappy-background.png',
      ground: process.env.PUBLIC_URL + '/ground.png'
    };
    
    // Loading process for each image
    Object.entries(imageSources).forEach(([key, src]) => {
      const img = new Image();
      
      // Loading events
      img.onload = () => {
        imagesRef.current[key] = img;
        imageLoadCountRef.current += 1;
        
        // Calculate progress percentage
        const progress = Math.floor((imageLoadCountRef.current / totalImages) * 100);
        setLoadingProgress(progress);
        
        // Start the game if all images are loaded
        if (imageLoadCountRef.current === totalImages) {
          setAssetsLoaded(true);
        }
      };
      
      // In case of error
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        imageLoadCountRef.current += 1;
        
        // Continue even if one image fails to load
        if (imageLoadCountRef.current === totalImages) {
          setAssetsLoaded(true);
        }
      };
      
      // Start loading images
      img.src = src;
    });
    
    // Mobile device detection
    const checkMobile = () => {
      const mobileCheck = window.innerWidth <= 768;
      setIsMobile(mobileCheck);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Game initialization - now the game will start after assets are loaded
  useEffect(() => {
    // Wait if assets are not loaded
    if (!assetsLoaded || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Game variables
    let bird = {
      x: canvas.width / 4,
      y: canvas.height / 2,
      width: isMobile ? 30 : 40,
      height: isMobile ? 24 : 30,
      velocity: 0,
      gravity: 800,
      lift: -350,
      rotation: 0
    };
    
    let pipes = [];
    let localScore = 0;
    let localGameOver = false;
    const pipeWidth = isMobile ? 70 : 80;
    const pipeGap = isMobile ? 180 : 170;
    const groundHeight = 80;
    
    // Background positions
    let bgPos = 0;
    let groundPos = 0;
    
    // Images are now ready since they were preloaded
    const { bird: birdImage, pipeTop: pipeTopImage, pipeBottom: pipeBottomImage, 
            background: backgroundImage, ground: groundImage } = imagesRef.current;
    
    // Score update
    const updateScore = () => {
      localScore++;
      setScore(localScore);
      setHighScore(prevHighScore => Math.max(prevHighScore, localScore));
    };
    
    // Jump function
    const jump = () => {
      if (localGameOver) return;
      bird.velocity = bird.lift;
    };
    
    // Add new pipe
    const addPipe = () => {
      const topHeight = Math.random() * (canvas.height - pipeGap - groundHeight - 120) + 60;
      const bottomY = topHeight + pipeGap;
      
      pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: bottomY,
        passed: false
      });
    };
    
    // Event listeners
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        jump();
        e.preventDefault();
      }
    };
    
    const handleMouseClick = () => {
      jump();
    };
    
    const handleTouchStart = (e) => {
      e.preventDefault();
      jump();
    };
    
    // Game loop - FPS independent
    const gameLoop = (timestamp) => {
      // Delta time calculation
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 1/30);
      lastTimeRef.current = timestamp;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background drawing - no need to check since images are preloaded
      // Using Math.floor for pixel-perfect positioning
      bgPos = (bgPos - bgSpeedRef.current * deltaTime) % backgroundImage.width;
      
      // Calculate new position - prevent negative values
      const bgOffset = Math.floor(bgPos % backgroundImage.width);
      const bgX = bgOffset < 0 ? bgOffset + backgroundImage.width : bgOffset;
      
      // Draw background - we can use fewer images on mobile devices for optimization
      ctx.drawImage(backgroundImage, bgX, 0, canvas.width + 2, canvas.height);
      ctx.drawImage(backgroundImage, bgX - backgroundImage.width, 0, canvas.width + 2, canvas.height);
      
      // Draw to the right if multiple images are needed
      if (bgX + canvas.width > backgroundImage.width) {
        ctx.drawImage(backgroundImage, bgX + backgroundImage.width, 0, canvas.width + 2, canvas.height);
      }
      
      // Update and draw pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeedRef.current * deltaTime;
        
        // Pipe visual - no need to check since we're sure it's loaded
        ctx.drawImage(pipeTopImage, pipe.x, pipe.topHeight - pipeTopImage.height, pipeWidth, pipeTopImage.height);
        ctx.drawImage(
          pipeBottomImage, 
          pipe.x, 
          pipe.bottomY, 
          pipeWidth, 
          canvas.height - pipe.bottomY
        );
        
        // Score check
        if (bird.x > pipe.x + pipeWidth && !pipe.passed) {
          pipe.passed = true;
          updateScore();
        }
        
        // Collision detection
        if (
          bird.x + bird.width > pipe.x && 
          bird.x < pipe.x + pipeWidth && 
          (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)
        ) {
          localGameOver = true;
          setIsGameOver(true);
        }
        
        // Remove pipes that are off screen
        if (pipe.x + pipeWidth < 0) {
          pipes.splice(i, 1);
        }
      }
      
      // Update bird
      bird.velocity += bird.gravity * deltaTime;
      bird.y += bird.velocity * deltaTime;
      
      // Rotate bird (based on velocity)
      bird.rotation = Math.min(Math.PI/2, Math.max(-Math.PI/2, bird.velocity * 0.002));
      
      // Ground and ceiling checks
      if (bird.y > canvas.height - bird.height - groundHeight) {
        bird.y = canvas.height - bird.height - groundHeight;
        localGameOver = true;
        setIsGameOver(true);
      }
      
      if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
      }
      
      // Draw bird
      ctx.save();
      ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
      ctx.rotate(bird.rotation);
      ctx.drawImage(birdImage, -bird.width/2, -bird.height/2, bird.width, bird.height);
      ctx.restore();
      
      // Draw ground - similar approach for optimization
      groundPos = (groundPos - groundSpeedRef.current * deltaTime) % groundImage.width;
      
      // Calculate new position - prevent negative values
      const groundOffset = Math.floor(groundPos % groundImage.width);
      const groundX = groundOffset < 0 ? groundOffset + groundImage.width : groundOffset;
      
      // Draw ground, use +2 pixels to definitely close gaps
      ctx.drawImage(groundImage, groundX, canvas.height - groundHeight, canvas.width + 2, groundHeight);
      ctx.drawImage(groundImage, groundX - groundImage.width, canvas.height - groundHeight, canvas.width + 2, groundHeight);
      
      // Draw to the right if multiple images are needed
      if (groundX + canvas.width > groundImage.width) {
        ctx.drawImage(groundImage, groundX + groundImage.width, canvas.height - groundHeight, canvas.width + 2, groundHeight);
      }
      
      // Add new pipe - Time based
      pipeSpawnTimeRef.current += deltaTime;
      if (pipeSpawnTimeRef.current >= PIPE_SPAWN_INTERVAL && !localGameOver) {
        pipeSpawnTimeRef.current = 0;
        addPipe();
      }
      
      // Draw score
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
      ctx.font = isMobile ? 'bold 30px Arial' : 'bold 40px Arial';
      ctx.textAlign = 'center';
      
      ctx.strokeText(localScore.toString(), canvas.width/2, 60);
      ctx.fillText(localScore.toString(), canvas.width/2, 60);
      
      // Game Over screen
      if (localGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height/2 - 100, canvas.width, 200);
        
        ctx.fillStyle = 'white';
        ctx.font = isMobile ? 'bold 36px Arial' : 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 30);
        
        ctx.font = isMobile ? 'bold 18px Arial' : 'bold 24px Arial';
        ctx.fillText(`Score: ${localScore}`, canvas.width/2, canvas.height/2 + 10);
        ctx.fillText(`High Score: ${Math.max(localScore, highScore)}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Tap to restart', canvas.width/2, canvas.height/2 + 80);
        
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    // Restart game
    const restartGame = () => {
      if (localGameOver) {
        bird = {
          x: canvas.width / 4,
          y: canvas.height / 2,
          width: isMobile ? 30 : 40,
          height: isMobile ? 24 : 30,
          velocity: 0,
          gravity: 800,
          lift: -350,
          rotation: 0
        };
        pipes = [];
        localScore = 0;
        lastTimeRef.current = 0;
        pipeSpawnTimeRef.current = 0;
        localGameOver = false;
        setIsGameOver(false);
        setScore(0);
        addPipe();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      }
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Add first pipe
    addPipe();
    
    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // Restart event listeners
    canvas.addEventListener('click', restartGame);
    canvas.addEventListener('touchstart', (e) => {
      if (localGameOver) {
        e.preventDefault();
        restartGame();
      }
    }, { passive: false });
    
    // Update canvas dimensions
    const handleResize = () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      
      if (bird) {
        bird.x = canvas.width / 4;
        bird.y = canvas.height / 2;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleMouseClick);
      canvas.removeEventListener('click', restartGame);
      canvas.removeEventListener('touchstart', handleTouchStart);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isMobile, assetsLoaded]); // Added assetsLoaded to dependencies
  
  // Create loading screen
  const renderLoadingScreen = () => {
    return (
      <div className="loading-screen">
        <h2>Flappy Loading...</h2>
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{width: `${loadingProgress}%`}}
          >
            {loadingProgress}%
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flappy-game-container">
      <div className="flappy-game-header">
        <button className="close-button" onClick={onClose}>X</button>
        <div className="game-instructions">
          <p>{isMobile ? "Tap Screen to Play" : "Press Space Button or Just Click to Play"}</p>
        </div>
      </div>
      
      {!assetsLoaded ? (
        renderLoadingScreen()
      ) : (
        <canvas ref={canvasRef} className="flappy-canvas" />
      )}
      
      <div className="flappy-game-footer">
        <div className="score-display">
          <span>Score: {score}</span>
          <span>High Score: {highScore}</span>
        </div>
      </div>
    </div>
  );
};

export default FlappyGame;

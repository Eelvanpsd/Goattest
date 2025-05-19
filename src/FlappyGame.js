import React, { useEffect, useRef, useState, useCallback } from 'react';
import './FlappyGame.css';

const FlappyGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Referanslar oluşturalım (useRef ile tutarsak dependency array'e koymaya gerek kalmaz)
  const lastTimeRef = useRef(0);
  
  // FPS bağımsız sabit hızlar (piksel/saniye)
  const pipeSpeedRef = useRef(150); // Sabit hız (mobil ve desktop için aynı)
  const groundSpeedRef = useRef(150); 
  const bgSpeedRef = useRef(50);
  
  // Frame count için zamanlama (saniye cinsinden)
  const pipeSpawnTimeRef = useRef(0);
  const PIPE_SPAWN_INTERVAL = 2.0; // 2 saniyede bir boru

  // Mobil cihaz kontrolü
  useEffect(() => {
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

  // Oyunu başlat - highScore bağımlılığı KALDIRILDI
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Canvas boyutlarını ayarla
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // FPS bağımsız oyun değişkenleri
    let bird = {
      x: canvas.width / 4,
      y: canvas.height / 2,
      width: isMobile ? 30 : 40,
      height: isMobile ? 24 : 30,
      velocity: 0,
      gravity: 800, // piksel/saniye² - FPS bağımsız
      lift: -350, // piksel/saniye - FPS bağımsız
      rotation: 0
    };
    
    // Oyun görselleri
    const birdImage = new Image();
    birdImage.src = process.env.PUBLIC_URL + '/Flappy.png';
    
    const pipeTopImage = new Image();
    pipeTopImage.src = process.env.PUBLIC_URL + '/pipe-top.png';
    
    const pipeBottomImage = new Image();
    pipeBottomImage.src = process.env.PUBLIC_URL + '/pipe-bottom.png';
    
    const backgroundImage = new Image();
    backgroundImage.src = process.env.PUBLIC_URL + '/flappy-background.png';
    
    const groundImage = new Image();
    groundImage.src = process.env.PUBLIC_URL + '/ground.png';
    
    // Oyun değişkenleri
    let pipes = [];
    let localScore = 0;
    let localGameOver = false;
    const pipeWidth = isMobile ? 70 : 80;
    const pipeGap = isMobile ? 180 : 170;
    const groundHeight = 80;
    
    // Arka plan pozisyonları
    let bgPos = 0;
    let groundPos = 0;
    
    // Skor güncelleme fonksiyonu
    const updateScore = () => {
      localScore++;
      setScore(localScore);
      
      // highScore'u direkt setHighScore ile güncelle, bağımlılık oluşturma
      setHighScore(prevHighScore => Math.max(prevHighScore, localScore));
    };
    
    // Jump fonksiyonu
    const jump = () => {
      if (localGameOver) return;
      bird.velocity = bird.lift; // FPS bağımsız lift
    };
    
    // Yeni boru ekleme fonksiyonu
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
    
    // Event listener'lar
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
    
    // Oyun döngüsü - FPS bağımsız
    const gameLoop = (timestamp) => {
      // Delta time hesaplama (saniye cinsinden)
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 1/30); // Max 1/30 saniye (30 FPS cap)
      lastTimeRef.current = timestamp;
      
      // Arka planı çiz
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Arka plan resmi
      if (backgroundImage.complete) {
        bgPos = (bgPos - bgSpeedRef.current * deltaTime) % backgroundImage.width;
        ctx.drawImage(backgroundImage, bgPos, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImage, bgPos + canvas.width, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Boruları güncelle ve çiz
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeedRef.current * deltaTime;
        
        // Boru görseli
        if (pipeTopImage.complete && pipeBottomImage.complete) {
          ctx.drawImage(pipeTopImage, pipe.x, pipe.topHeight - pipeTopImage.height, pipeWidth, pipeTopImage.height);
          ctx.drawImage(
            pipeBottomImage, 
            pipe.x, 
            pipe.bottomY, 
            pipeWidth, 
            canvas.height - pipe.bottomY
          );
        } else {
          ctx.fillStyle = '#2ecc71';
          ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
          ctx.fillRect(
            pipe.x, 
            pipe.bottomY, 
            pipeWidth, 
            canvas.height - pipe.bottomY
          );
        }
        
        // Skor kontrolü
        if (bird.x > pipe.x + pipeWidth && !pipe.passed) {
          pipe.passed = true;
          updateScore();
        }
        
        // Çarpışma kontrolü
        if (
          bird.x + bird.width > pipe.x && 
          bird.x < pipe.x + pipeWidth && 
          (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)
        ) {
          localGameOver = true;
          setIsGameOver(true);
        }
        
        // Ekrandan çıkan boruları sil
        if (pipe.x + pipeWidth < 0) {
          pipes.splice(i, 1);
        }
      }
      
      // Kuşu güncelle (FPS bağımsız fizik)
      bird.velocity += bird.gravity * deltaTime;
      bird.y += bird.velocity * deltaTime;
      
      // Kuşu döndür (hıza göre)
      bird.rotation = Math.min(Math.PI/2, Math.max(-Math.PI/2, bird.velocity * 0.002));
      
      // Zemin ve tavan kontrolleri
      if (bird.y > canvas.height - bird.height - groundHeight) {
        bird.y = canvas.height - bird.height - groundHeight;
        localGameOver = true;
        setIsGameOver(true);
      }
      
      if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
      }
      
      // Kuşu çiz
      ctx.save();
      ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
      ctx.rotate(bird.rotation);
      
      if (birdImage.complete) {
        ctx.drawImage(birdImage, -bird.width/2, -bird.height/2, bird.width, bird.height);
      } else {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-bird.width/2, -bird.height/2, bird.width, bird.height);
      }
      
      ctx.restore();
      
      // Zemini çiz
      if (groundImage.complete) {
        groundPos = (groundPos - groundSpeedRef.current * deltaTime) % groundImage.width;
        ctx.drawImage(groundImage, groundPos, canvas.height - groundHeight, canvas.width, groundHeight);
        ctx.drawImage(groundImage, groundPos + canvas.width, canvas.height - groundHeight, canvas.width, groundHeight);
      } else {
        ctx.fillStyle = '#dec587';
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
      }
      
      // Yeni boru ekle - Zaman bazlı
      pipeSpawnTimeRef.current += deltaTime;
      if (pipeSpawnTimeRef.current >= PIPE_SPAWN_INTERVAL && !localGameOver) {
        pipeSpawnTimeRef.current = 0;
        addPipe();
      }
      
      // Skoru çiz
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
      ctx.font = isMobile ? 'bold 30px Arial' : 'bold 40px Arial';
      ctx.textAlign = 'center';
      
      ctx.strokeText(localScore.toString(), canvas.width/2, 60);
      ctx.fillText(localScore.toString(), canvas.width/2, 60);
      
      // Game Over ekranı
      if (localGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height/2 - 100, canvas.width, 200);
        
        ctx.fillStyle = 'white';
        ctx.font = isMobile ? 'bold 36px Arial' : 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 30);
        
        ctx.font = isMobile ? 'bold 18px Arial' : 'bold 24px Arial';
        ctx.fillText(`Score: ${localScore}`, canvas.width/2, canvas.height/2 + 10);
        // highScore güncellemesini burada da güvenli hale getir
        ctx.fillText(`High Score: ${Math.max(localScore, highScore)}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Tap to restart', canvas.width/2, canvas.height/2 + 80);
        
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    // Restart oyunu
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
    
    // Event listener'ları ekle
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // İlk boruyu ekle
    addPipe();
    
    // Oyun döngüsünü başlat
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // Restart event listener'ları
    canvas.addEventListener('click', restartGame);
    canvas.addEventListener('touchstart', (e) => {
      if (localGameOver) {
        e.preventDefault();
        restartGame();
      }
    }, { passive: false });
    
    // Canvas boyutlarını güncelle
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
    
    // Temizlik fonksiyonu
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
  }, [isMobile]); // ✅ highScore bağımlılığı KALDIRILDI
  
  return (
    <div className="flappy-game-container">
      <div className="flappy-game-header">
        <button className="close-button" onClick={onClose}>X</button>
        <div className="game-instructions">
          <p>{isMobile ? "Tap Screen to Play" : "Press Space Button or Just Click to Play"}</p>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="flappy-canvas" />
      
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

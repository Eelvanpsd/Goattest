import React, { useEffect, useRef, useState } from 'react';
import './FlappyGame.css';

const FlappyGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sabit referanslar
  const lastTimeRef = useRef(0);
  const pipeSpeedRef = useRef(150);
  const groundSpeedRef = useRef(150);
  const bgSpeedRef = useRef(50);
  const pipeSpawnTimeRef = useRef(0);
  const PIPE_SPAWN_INTERVAL = 2.0;
  
  // Tüm resimler için referanslar
  const birdImageRef = useRef(null);
  const pipeTopImageRef = useRef(null);
  const pipeBottomImageRef = useRef(null);
  const backgroundImageRef = useRef(null);
  const groundImageRef = useRef(null);
  
  // Mobil cihaz tespiti
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
  
  // Resimleri yükle ve takip et
  useEffect(() => {
    // Tüm resimleri yüklemeden önce canvas görünmesin
    if (!canvasRef.current) return;
    
    const loadImages = async () => {
      // Tüm resimleri yükleme işlemi
      const imagePromises = [];
      
      // Kuş resmi
      const birdImage = new Image();
      const birdPromise = new Promise((resolve, reject) => {
        birdImage.onload = () => {
          birdImageRef.current = birdImage;
          resolve();
        };
        birdImage.onerror = () => reject(new Error("Kuş resmi yüklenemedi"));
      });
      birdImage.src = process.env.PUBLIC_URL + '/Flappy.png';
      imagePromises.push(birdPromise);
      
      // Üst boru resmi
      const pipeTopImage = new Image();
      const pipeTopPromise = new Promise((resolve, reject) => {
        pipeTopImage.onload = () => {
          pipeTopImageRef.current = pipeTopImage;
          resolve();
        };
        pipeTopImage.onerror = () => reject(new Error("Üst boru resmi yüklenemedi"));
      });
      pipeTopImage.src = process.env.PUBLIC_URL + '/pipe-top.png';
      imagePromises.push(pipeTopPromise);
      
      // Alt boru resmi
      const pipeBottomImage = new Image();
      const pipeBottomPromise = new Promise((resolve, reject) => {
        pipeBottomImage.onload = () => {
          pipeBottomImageRef.current = pipeBottomImage;
          resolve();
        };
        pipeBottomImage.onerror = () => reject(new Error("Alt boru resmi yüklenemedi"));
      });
      pipeBottomImage.src = process.env.PUBLIC_URL + '/pipe-bottom.png';
      imagePromises.push(pipeBottomPromise);
      
      // Arka plan resmi
      const backgroundImage = new Image();
      const backgroundPromise = new Promise((resolve, reject) => {
        backgroundImage.onload = () => {
          backgroundImageRef.current = backgroundImage;
          resolve();
        };
        backgroundImage.onerror = () => reject(new Error("Arka plan resmi yüklenemedi"));
      });
      backgroundImage.src = process.env.PUBLIC_URL + '/flappy-background.png';
      imagePromises.push(backgroundPromise);
      
      // Zemin resmi
      const groundImage = new Image();
      const groundPromise = new Promise((resolve, reject) => {
        groundImage.onload = () => {
          groundImageRef.current = groundImage;
          resolve();
        };
        groundImage.onerror = () => reject(new Error("Zemin resmi yüklenemedi"));
      });
      groundImage.src = process.env.PUBLIC_URL + '/ground.png';
      imagePromises.push(groundPromise);
      
      try {
        // Tüm resimlerin yüklenmesini bekle (Promise.all ile)
        await Promise.all(imagePromises);
        console.log("Tüm resimler başarıyla yüklendi!");
        setIsLoading(false); // Yükleme tamamlandı
        initializeGame(); // Oyunu başlat
      } catch (error) {
        console.error("Resim yükleme hatası:", error);
        // Hata durumunda da oyunu başlatalım ama basit grafik kullanarak
        setIsLoading(false);
        initializeGame(true); // Basit grafik modu ile başlat
      }
    };
    
    loadImages();
    
    // Temizlik
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);
  
  // Oyunu başlatma ve game loop'u kurma
  const initializeGame = (simpleGraphics = false) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Canvas boyutlarını ayarla
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Oyun değişkenleri
    let bird = {
      x: canvas.width / 4,
      y: canvas.height / 2,
      width: isMobile ? 30 : 40,
      height: isMobile ? 24 : 30,
      velocity: 0,
      gravity: 800, // piksel/saniye²
      lift: -350, // piksel/saniye
      rotation: 0
    };
    
    let pipes = [];
    let score = 0;
    let gameOver = false;
    const pipeWidth = isMobile ? 70 : 80;
    const pipeGap = isMobile ? 180 : 170;
    const groundHeight = 80;
    
    // Arka plan ve zemin pozisyonları
    let bgPos = 0;
    let groundPos = 0;
    
    // Skor güncelleme
    const updateScore = () => {
      score++;
      setScore(score);
      setHighScore(prev => Math.max(prev, score));
    };
    
    // Jump fonksiyonu
    const jump = () => {
      if (gameOver) return;
      bird.velocity = bird.lift;
    };
    
    // Yeni boru ekle
    const addPipe = () => {
      const topHeight = Math.random() * (canvas.height - pipeGap - groundHeight - 120) + 60;
      const bottomY = topHeight + pipeGap;
      
      pipes.push({
        x: canvas.width,
        topHeight,
        bottomY,
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
    
    const handleClick = () => {
      // Eğer oyun bittiyse, yeniden başlat
      if (gameOver) {
        restart();
      } else {
        jump();
      }
    };
    
    const handleTouch = (e) => {
      e.preventDefault();
      // Eğer oyun bittiyse, yeniden başlat
      if (gameOver) {
        restart();
      } else {
        jump();
      }
    };
    
    // Event listener'ları ekle
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    
    // Basit grafik modu için renkler
    const simpleColors = {
      background: '#70c5ce',
      bird: '#ffce00',
      pipe: '#3dc15b', 
      ground: '#dec587'
    };
    
    // Oyun döngüsü - FPS bağımsız
    const gameLoop = (timestamp) => {
      // Delta time hesaplama (saniye cinsinden)
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 1/30); // Max 1/30 saniye
      lastTimeRef.current = timestamp;
      
      // Canvas temizleme
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mobil için arka plan çizimi - resimleri kullan veya basit renkler
      if (simpleGraphics || !backgroundImageRef.current) {
        // Basit arka plan
        ctx.fillStyle = simpleColors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Arka plan resmi ile çizim
        const bgImage = backgroundImageRef.current;
        bgPos = (bgPos - bgSpeedRef.current * deltaTime) % bgImage.width;
        const bgX = Math.floor(bgPos);
        
        // Mobil optimizasyonu - sırayla çiz, hafıza kullanımını azalt
        ctx.drawImage(bgImage, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImage, bgX + canvas.width, 0, canvas.width, canvas.height);
      }
      
      // Boruları güncelle ve çiz
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeedRef.current * deltaTime;
        
        if (simpleGraphics || !pipeTopImageRef.current || !pipeBottomImageRef.current) {
          // Basit boru grafikleri
          ctx.fillStyle = simpleColors.pipe;
          ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
          ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        } else {
          // Resimlerle çizim
          ctx.drawImage(
            pipeTopImageRef.current, 
            pipe.x, 
            pipe.topHeight - pipeTopImageRef.current.height, 
            pipeWidth, 
            pipeTopImageRef.current.height
          );
          ctx.drawImage(
            pipeBottomImageRef.current, 
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
          gameOver = true;
          setIsGameOver(true);
        }
        
        // Ekrandan çıkan boruları sil
        if (pipe.x + pipeWidth < 0) {
          pipes.splice(i, 1);
        }
      }
      
      // Kuşu güncelle
      bird.velocity += bird.gravity * deltaTime;
      bird.y += bird.velocity * deltaTime;
      bird.rotation = Math.min(Math.PI/2, Math.max(-Math.PI/2, bird.velocity * 0.002));
      
      // Zemin ve tavan kontrolleri
      if (bird.y > canvas.height - bird.height - groundHeight) {
        bird.y = canvas.height - bird.height - groundHeight;
        gameOver = true;
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
      
      if (simpleGraphics || !birdImageRef.current) {
        // Basit kuş
        ctx.fillStyle = simpleColors.bird;
        ctx.fillRect(-bird.width/2, -bird.height/2, bird.width, bird.height);
      } else {
        // Resimle kuş
        ctx.drawImage(
          birdImageRef.current, 
          -bird.width/2, 
          -bird.height/2, 
          bird.width, 
          bird.height
        );
      }
      
      ctx.restore();
      
      // Zemini çiz
      if (simpleGraphics || !groundImageRef.current) {
        // Basit zemin
        ctx.fillStyle = simpleColors.ground;
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
      } else {
        // Zemin resmi
        const groundImage = groundImageRef.current;
        groundPos = (groundPos - groundSpeedRef.current * deltaTime) % groundImage.width;
        const groundX = Math.floor(groundPos);
        
        // Optimize edilmiş zemin çizimi
        ctx.drawImage(
          groundImage, 
          groundX, 
          canvas.height - groundHeight, 
          canvas.width, 
          groundHeight
        );
        ctx.drawImage(
          groundImage, 
          groundX + canvas.width, 
          canvas.height - groundHeight, 
          canvas.width, 
          groundHeight
        );
      }
      
      // Yeni boru ekle
      pipeSpawnTimeRef.current += deltaTime;
      if (pipeSpawnTimeRef.current >= PIPE_SPAWN_INTERVAL && !gameOver) {
        pipeSpawnTimeRef.current = 0;
        addPipe();
      }
      
      // Skoru çiz
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
      ctx.font = isMobile ? 'bold 30px Arial' : 'bold 40px Arial';
      ctx.textAlign = 'center';
      
      ctx.strokeText(score.toString(), canvas.width/2, 60);
      ctx.fillText(score.toString(), canvas.width/2, 60);
      
      // Game Over ekranı
      if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height/2 - 100, canvas.width, 200);
        
        ctx.fillStyle = 'white';
        ctx.font = isMobile ? 'bold 36px Arial' : 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 30);
        
        ctx.font = isMobile ? 'bold 18px Arial' : 'bold 24px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 10);
        ctx.fillText(`High Score: ${Math.max(score, highScore)}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Tap to restart', canvas.width/2, canvas.height/2 + 80);
        
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    // Restart oyun
    const restart = () => {
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
      score = 0;
      gameOver = false;
      setIsGameOver(false);
      setScore(0);
      lastTimeRef.current = 0;
      pipeSpawnTimeRef.current = 0;
      
      // İlk boruyu ekle
      addPipe();
      
      // Game loop'u yeniden başlat
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    // Canvas boyut değişikliklerini ele al
    const handleResize = () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      
      bird.x = canvas.width / 4;
      bird.y = canvas.height / 2;
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Oyunu başlat
    addPipe();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // Temizlik fonksiyonu
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
      
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  };
  
  // Renderlanacak komponent
  return (
    <div className="flappy-game-container">
      <div className="flappy-game-header">
        <button className="close-button" onClick={onClose}>X</button>
        <div className="game-instructions">
          <p>{isMobile ? "Tap Screen to Play" : "Press Space Button or Just Click to Play"}</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flappy-loading">
          <div className="flappy-loading-text">
            Loading Game...
          </div>
          <div className="flappy-spinner"></div>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="flappy-canvas"
          style={{display: isLoading ? 'none' : 'block'}}
        />
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
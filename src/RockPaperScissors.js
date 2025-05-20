import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './RockPaperScissors.css';

// Import PNG images (adjust paths as needed)
import winPng from './assets/win.png';
import losePng from './assets/lose.png';
import tiePng from './assets/tie.png';

// UPDATED CONTRACT ADDRESS - Your deployed contract
const CONTRACT_ADDRESS = '0x1f45C08E00A8469c87431Aa1b63Fb64FDC295Fb6';
const TOKEN_ADDRESS = '0xB9C188BC558a82a1eE9E75AE0857df443F407632';

// Backend service URL (bot service endpoint)
const BOT_SERVICE_URL = process.env.REACT_APP_BOT_SERVICE_URL || 'http://localhost:3001';

// Avalanche network configuration
const AVALANCHE_NETWORK = {
  chainId: '0xA86A', // 43114 in hex
  chainName: 'Avalanche Mainnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://snowtrace.io/']
};

// Contract ABI
const CONTRACT_ABI = [
  "function createGame(uint256 _bet, bytes32 _commitHash) external",
  "function joinGame(uint256 _id, uint8 _choice) external",
  "function reveal(uint256 _id, uint8 _choice, uint256 _nonce) external",
  "function autoRevealWithProof(uint256 _id, uint8 _revealedChoice, uint256 _nonce) external",
  "function autoReveal(uint256 _id) external",
  "function cancel(uint256 _id) external",
  "function forceCancel(uint256 _id) external",
  "function addBot(address _bot) external",
  "function removeBot(address _bot) external",
  
  // View functions
  "function getActive() external view returns (uint256[])",
  "function getFinished(uint256 _limit) external view returns (uint256[])",
  "function getGame(uint256 _id) external view returns (tuple(address p1, address p2, uint256 bet, bytes32 p1CommitHash, uint8 p2Choice, uint8 state, uint256 created, uint256 joinedAt, address winner, uint8 p1Choice, bool autoResolved), uint256)",
  "function getStats(address _player) external view returns (tuple(uint256 played, uint256 won, uint256 bet, uint256 winnings, uint256 ties))",
  "function canAutoResolve(uint256 _id) external view returns (bool)",
  "function hash(uint8 _choice, uint256 _nonce, address _player) external pure returns (bytes32)",
  "function authorizedBots(address _bot) external view returns (bool)",
  
  // Constants
  "function HOUSE_FEE() external view returns (uint256)",
  "function AUTO_RESOLVE_TIME() external view returns (uint256)",
  "function TIME_TOLERANCE() external view returns (uint256)",
  
  // Events
  "event GameCreated(uint256 indexed id, address indexed p1, uint256 bet)",
  "event PlayerJoined(uint256 indexed id, address indexed p2)",
  "event GameAutoResolved(uint256 indexed id, address indexed winner, uint256 winnings)",
  "event GameTied(uint256 indexed id, uint256 refundAmount)",
  "event GameCancelled(uint256 indexed id)",
  "event ChoiceRevealed(uint256 indexed id, address indexed p1, uint8 choice)",
  "event BotAuthorized(address indexed bot)",
  "event BotRevoked(address indexed bot)"
];

// ERC20 ABI (for token operations)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Game states
const GAME_STATES = {
  0: 'Waiting',
  1: 'Joined', 
  2: 'Done',
  3: 'Cancelled',
  4: 'Tied'
};

// Choices
const CHOICES = {
  0: { name: 'Rock', emoji: './rock.png', icon: './rock.png' },
  1: { name: 'Paper', emoji: './paper.png', icon: './paper.png' },
  2: { name: 'Scissors', emoji: './scissors.png', icon: './scissors.png' },
  3: { name: 'None', emoji: '❓', icon: '❓' }
};

const RockPaperScissors = ({ onClose }) => {
  // State management
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkCorrect, setNetworkCorrect] = useState(false);
  
  // Game state
  const [activeGames, setActiveGames] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // UI state
  const [currentView, setCurrentView] = useState('games'); // games, create, history, stats
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenAllowance, setTokenAllowance] = useState('0');
  const [gameResultPopup, setGameResultPopup] = useState(null);
  
  // Game specific state
  const [pendingReveals, setPendingReveals] = useState(new Map());
  
  // Bot connection state
  const [botConnected, setBotConnected] = useState(false);
  
  // Add mobile-specific state and handlers
  const [isMobile, setIsMobile] = useState(false);

  // Refs for cleanup
  const eventListenersRef = useRef(new Map());
  const intervalsRef = useRef(new Map());

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    window.addEventListener('orientationchange', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
      window.removeEventListener('orientationchange', checkIsMobile);
    };
  }, []);

  // Bot connection test function
  const testBotConnection = async () => {
    try {
      const response = await fetch(`${BOT_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (response.ok) {
        const data = await response.json();
        setBotConnected(true);
        setError('');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setBotConnected(false);
      return false;
    }
  };

  // Check if already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      await testBotConnection();
      
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0) {
            await connectWallet();
          } else {
            await loadPublicData();
            
            const publicRefreshInterval = setInterval(async () => {
              try {
                if (!account) {
                  await loadPublicData();
                }
              } catch (error) {
                console.error('Public periodic refresh failed:', error);
              }
            }, 20000);
            
            intervalsRef.current.set('public_refresh', publicRefreshInterval);
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };
    
    checkConnection();
    
    return () => {
      cleanup();
    };
  }, []);

  // Check network when account changes
  useEffect(() => {
    if (account) {
      checkNetwork();
    }
  }, [account]);

  // Bot connection monitoring
  useEffect(() => {
    testBotConnection();
    
    const botTestInterval = setInterval(testBotConnection, 60000);
    intervalsRef.current.set('bot_test', botTestInterval);
    
    return () => {
      clearInterval(botTestInterval);
      intervalsRef.current.delete('bot_test');
    };
  }, []);

  // Load public data (all active games) even without wallet connection
  const loadPublicData = async () => {
    try {
      setLoading(true);
      
      const publicProvider = new ethers.providers.JsonRpcProvider(AVALANCHE_NETWORK.rpcUrls[0]);
      const publicContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicProvider);
      
      const activeIds = await publicContract.getActive();
      const activeGamesData = await Promise.all(
        activeIds.map(async (id) => {
          const [game, deadline] = await publicContract.getGame(id);
          return { id: id.toString(), game, deadline };
        })
      );
      
      // Filter out games that are in "Joined" state (state 1) for non-connected users
      // and games that are "Joined" but user is not a player
      const filteredGames = activeGamesData.filter(gameData => {
        const { game } = gameData;
        
        // If user is not connected, only show "Waiting" games (state 0)
        if (!account) {
          return game.state === 0;
        }
        
        // If user is connected, show all active games where user is involved
        // or games that are still in "Waiting" state
        const isPlayer1 = game.p1.toLowerCase() === account.toLowerCase();
        const isPlayer2 = game.p2.toLowerCase() === account.toLowerCase();
        const isInvolved = isPlayer1 || isPlayer2;
        
        return game.state === 0 || isInvolved;
      });
      
      setActiveGames(filteredGames);
      
    } catch (error) {
      console.error('Failed to load public data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup function
  const cleanup = () => {
    eventListenersRef.current.forEach((listener, event) => {
      if (contract) {
        contract.off(event, listener);
      }
    });
    eventListenersRef.current.clear();
    
    intervalsRef.current.forEach((interval, key) => {
      clearTimeout(interval);
      clearInterval(interval);
    });
    intervalsRef.current.clear();
  };

  // Check if user is on Avalanche network
  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId === AVALANCHE_NETWORK.chainId) {
        setNetworkCorrect(true);
      } else {
        setNetworkCorrect(false);
        await switchToAvalanche();
      }
    } catch (error) {
      console.error('Error checking network:', error);
      setNetworkCorrect(false);
    }
  };

  // Switch to Avalanche network
  const switchToAvalanche = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AVALANCHE_NETWORK.chainId }],
      });
      setNetworkCorrect(true);
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AVALANCHE_NETWORK],
          });
          setNetworkCorrect(true);
        } catch (addError) {
          console.error('Failed to add Avalanche network:', addError);
          setError('Failed to add Avalanche network');
        }
      } else {
        console.error('Failed to switch to Avalanche network:', switchError);
        setError('Please switch to Avalanche network manually');
      }
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const account = accounts[0];
      
      const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
      
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setContract(gameContract);
      setTokenContract(tokenContract);
      
      await checkNetwork();
      
      if (networkCorrect) {
        await loadGameData(gameContract, tokenContract, account);
        setupEventListeners(gameContract);
      }
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setError('Failed to connect to wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Load game data when network is correct
  useEffect(() => {
    if (contract && tokenContract && account && networkCorrect) {
      loadGameData(contract, tokenContract, account);
      setupEventListeners(contract);
      
      const refreshInterval = setInterval(async () => {
        try {
          await loadGameData(contract, tokenContract, account);
        } catch (error) {
          console.error('Periodic refresh failed:', error);
        }
      }, 30000);
      
      intervalsRef.current.set('periodic_refresh', refreshInterval);
      
      return () => {
        clearInterval(refreshInterval);
        intervalsRef.current.delete('periodic_refresh');
      };
    }
  }, [contract, tokenContract, account, networkCorrect]);

  // Event listener setup
  const setupEventListeners = (gameContract) => {
    const events = [
      'GameCreated',
      'PlayerJoined', 
      'GameAutoResolved',
      'GameTied',
      'GameCancelled',
      'ChoiceRevealed'
    ];
    
    const autoRefresh = async (delay = 2000) => {
      setTimeout(async () => {
        try {
          if (account && contract && tokenContract) {
            await loadGameData(contract, tokenContract, account);
          } else {
            await loadPublicData();
          }
        } catch (error) {
          console.error('Auto refresh failed:', error);
        }
      }, delay);
    };
    
    events.forEach(eventName => {
      const listener = (...args) => {
        console.log(`${eventName} event:`, args);
        
        if (eventName === 'GameCreated') {
          autoRefresh(1000);
        }
        
        if (eventName === 'PlayerJoined') {
          autoRefresh(1500);
        }
        
        if (eventName === 'ChoiceRevealed') {
          autoRefresh(1000);
        }
        
        // Handle auto-resolved games
        if (eventName === 'GameAutoResolved') {
          const [gameId, winner, winnings] = args;
          const gameIdStr = gameId.toString();
          const winnerAddr = winner.toLowerCase();
          const userAddr = account?.toLowerCase();
          
          setTimeout(async () => {
            try {
              const [gameDetails] = await gameContract.getGame(gameId);
              const isPlayer1 = gameDetails.p1.toLowerCase() === userAddr;
              const isPlayer2 = gameDetails.p2.toLowerCase() === userAddr;
              const isInvolved = isPlayer1 || isPlayer2;
              
              if (isInvolved) {
                const isWinner = winnerAddr === userAddr;
                
                setGameResultPopup({
                  gameId: gameIdStr,
                  winner: winner,
                  winnings: winnings,
                  isWinner: isWinner,
                  result: isWinner ? 'won' : 'lost',
                  playerChoice: isPlayer1 ? gameDetails.p1Choice : gameDetails.p2Choice,
                  opponentChoice: isPlayer1 ? gameDetails.p2Choice : gameDetails.p1Choice,
                  betAmount: gameDetails.bet,
                  autoResolved: true
                });
              }
            } catch (error) {
              console.error('Error fetching game details for popup:', error);
            }
          }, 1000);
          
          autoRefresh(2000);
        }
        
        // Handle tie events
        if (eventName === 'GameTied') {
          const [gameId, refundAmount] = args;
          const gameIdStr = gameId.toString();
          const userAddr = account?.toLowerCase();
          
          setTimeout(async () => {
            try {
              const [gameDetails] = await gameContract.getGame(gameId);
              const isPlayer1 = gameDetails.p1.toLowerCase() === userAddr;
              const isPlayer2 = gameDetails.p2.toLowerCase() === userAddr;
              const isInvolved = isPlayer1 || isPlayer2;
              
              if (isInvolved) {
                setGameResultPopup({
                  gameId: gameIdStr,
                  result: 'tie',
                  refundAmount: refundAmount,
                  playerChoice: isPlayer1 ? gameDetails.p1Choice : gameDetails.p2Choice,
                  opponentChoice: isPlayer1 ? gameDetails.p2Choice : gameDetails.p1Choice,
                  betAmount: gameDetails.bet
                });
              }
            } catch (error) {
              console.error('Error fetching game details for tie popup:', error);
            }
          }, 1000);
          
          autoRefresh(2000);
        }
      };
      
      gameContract.on(eventName, listener);
      eventListenersRef.current.set(eventName, listener);
    });
  };

  // Load game data
  const loadGameData = async (gameContract, tokenContract, userAccount) => {
    try {
      setLoading(true);
      
      const activeIds = await gameContract.getActive();
      const activeGamesData = await Promise.all(
        activeIds.map(async (id) => {
          const [game, deadline] = await gameContract.getGame(id);
          return { id: id.toString(), game, deadline };
        })
      );
      
      // Filter active games: show "Waiting" games to everyone, 
      // but "Joined" games only to players involved
      const filteredActiveGames = activeGamesData.filter(gameData => {
        const { game } = gameData;
        
        // Show all "Waiting" games (state 0)
        if (game.state === 0) {
          return true;
        }
        
        // For "Joined" games (state 1), only show if user is involved
        if (game.state === 1) {
          const isPlayer1 = game.p1.toLowerCase() === userAccount.toLowerCase();
          const isPlayer2 = game.p2.toLowerCase() === userAccount.toLowerCase();
          return isPlayer1 || isPlayer2;
        }
        
        // Don't show other states (Done, Cancelled, Tied) in active games
        return false;
      });
      
      setActiveGames(filteredActiveGames);
      
      const finishedIds = await gameContract.getFinished(20);
      const finishedGamesData = await Promise.all(
        finishedIds.map(async (id) => {
          const [game, deadline] = await gameContract.getGame(id);
          return { id: id.toString(), game, deadline };
        })
      );
      setFinishedGames(finishedGamesData);
      
      const stats = await gameContract.getStats(userAccount);
      setPlayerStats(stats);
      
      const balance = await tokenContract.balanceOf(userAccount);
      const allowance = await tokenContract.allowance(userAccount, CONTRACT_ADDRESS);
      setTokenBalance(ethers.utils.formatEther(balance));
      setTokenAllowance(ethers.utils.formatEther(allowance));
      
    } catch (error) {
      console.error('Failed to load game data:', error);
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const generateNonce = () => {
    return ethers.BigNumber.from(ethers.utils.randomBytes(32));
  };

  // Create game function
  const createGame = async () => {
    if (!selectedChoice && selectedChoice !== 0) {
      setError('Please select your move');
      return;
    }
    
    if (!betAmount || parseInt(betAmount) <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }
    
    if (parseInt(betAmount) < 5000) {
      setError('Minimum bet amount is 5000 tokens');
      return;
    }
    
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    if (!networkCorrect) {
      setError('Please switch to Avalanche network');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const betWei = ethers.utils.parseEther(betAmount);
      const nonce = generateNonce();
      
      const hash = await contract.hash(selectedChoice, nonce, account);
      
      const currentAllowance = ethers.BigNumber.from(ethers.utils.parseEther(tokenAllowance));
      if (currentAllowance.lt(betWei)) {
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, betWei);
        await approveTx.wait();
        
        const newAllowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
        setTokenAllowance(ethers.utils.formatEther(newAllowance));
      }
      
      const tx = await contract.createGame(betWei, hash);
      const receipt = await tx.wait();
      
      const gameCreatedEvent = receipt.events.find(e => e.event === 'GameCreated');
      if (gameCreatedEvent) {
        const gameId = gameCreatedEvent.args.id.toString();
        
        const revealData = {
          choice: selectedChoice,
          nonce: nonce.toString(),
          account: account,
          hash: hash
        };
        
        try {
          const encryptedData = btoa(JSON.stringify(revealData));
          
          const response = await fetch(`${BOT_SERVICE_URL}/api/store-reveal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              gameId: gameId,
              encryptedRevealData: encryptedData
            }),
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          setBotConnected(true);
        } catch (error) {
          const encryptedData = btoa(JSON.stringify(revealData));
          localStorage.setItem(`reveal_${gameId}`, encryptedData);
          setBotConnected(false);
        }
        
        setPendingReveals(prev => new Map(prev.set(gameId, revealData)));
      }
      
      setSelectedChoice(null);
      setBetAmount('');
      setCurrentView('games');
      
      await loadGameData(contract, tokenContract, account);
      
    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Join existing game
  const joinGame = async (gameId, choice) => {
    if (!contract || !tokenContract) return;
    
    try {
      setLoading(true);
      setError('');
      
      const [game] = await contract.getGame(gameId);
      const betAmount = game.bet;
      
      const balance = await tokenContract.balanceOf(account);
      if (balance.lt(betAmount)) {
        setError(`Insufficient balance. You need ${formatTokenAmount(betAmount)} tokens to join this game.`);
        return;
      }
      
      const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
      if (allowance.lt(betAmount)) {
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, betAmount);
        await approveTx.wait();
        
        const newAllowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
        setTokenAllowance(ethers.utils.formatEther(newAllowance));
      }
      
      const tx = await contract.joinGame(gameId, choice);
      await tx.wait();
      
      await loadGameData(contract, tokenContract, account);
      
    } catch (error) {
      console.error('Failed to join game:', error);
      setError('Failed to join game: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Cancel game
  const cancelGame = async (gameId) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await contract.cancel(gameId);
      await tx.wait();
      
      localStorage.removeItem(`reveal_${gameId}`);
      setPendingReveals(prev => {
        const newMap = new Map(prev);
        newMap.delete(gameId);
        return newMap;
      });
      
      await loadGameData(contract, tokenContract, account);
      
    } catch (error) {
      console.error('Failed to cancel game:', error);
      setError('Failed to cancel game: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Format address
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format token amount
  const formatTokenAmount = (amount) => {
    return Math.floor(parseFloat(ethers.utils.formatEther(amount))).toString();
  };

  // Game result popup component
  const renderGameResultPopup = () => {
    if (!gameResultPopup) return null;
    
    const { gameId, winner, winnings, isWinner, result, refundAmount, playerChoice, opponentChoice, betAmount, autoResolved } = gameResultPopup;
    
    return (
      <div className="game-result-popup-overlay">
        <div className="game-result-popup">
          <div className={`result-header ${result}`}>
            {result === 'won' && (
              <>
                <div className="result-icon">
                  <img src={winPng} alt="Win" className="result-image" />
                </div>
                <h2>Congratulations!</h2>
                <p>You won the game!</p>
              </>
            )}
            {result === 'lost' && (
              <>
                <div className="result-icon">
                  <img src={losePng} alt="Lose" className="result-image" />
                </div>
                <h2>Game Over</h2>
                <p>You lost this round</p>
              </>
            )}
            {result === 'tie' && (
              <>
                <div className="result-icon">
                  <img src={tiePng} alt="Tie" className="result-image" />
                </div>
                <h2>It's a Tie!</h2>
                <p>Both players chose the same - refund issued</p>
              </>
            )}
          </div>
          
          <div className="result-details">
            <div className="game-info">
              <p><strong>Game #:</strong> {gameId}</p>
              
              {playerChoice !== undefined && opponentChoice !== undefined && (
                <div className="choices-display">
                  <div className="choice-row">
                    <span><strong>Your choice:</strong></span>
                    <span className="choice-display">
                      <img src={CHOICES[playerChoice]?.icon} alt={CHOICES[playerChoice]?.name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                      {CHOICES[playerChoice]?.name}
                    </span>
                  </div>
                  <div className="choice-row">
                    <span><strong>Opponent's choice:</strong></span>
                    <span className="choice-display">
                      <img src={CHOICES[opponentChoice]?.icon} alt={CHOICES[opponentChoice]?.name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                      {CHOICES[opponentChoice]?.name}
                    </span>
                  </div>
                </div>
              )}
              
              {betAmount && (
                <p><strong>Bet Amount:</strong> {formatTokenAmount(betAmount)} tokens</p>
              )}
              
              {result === 'tie' && refundAmount && (
                <p className="refund-highlight">
                  <strong>Refunded:</strong> {formatTokenAmount(refundAmount)} tokens (no fee)
                </p>
              )}
              
              {winner && <p><strong>Winner:</strong> {formatAddress(winner)}</p>}
              {winnings && (
                <>
                  <p><strong>Total Prize:</strong> {formatTokenAmount(winnings)} tokens</p>
                  {result === 'won' && (
                    <p className="profit-highlight">
                      <strong>Your Profit:</strong> +{formatTokenAmount(winnings.sub(betAmount || 0))} tokens
                    </p>
                  )}
                  {result === 'lost' && (
                    <p className="loss-highlight">
                      <strong>Your Loss:</strong> -{formatTokenAmount(betAmount || 0)} tokens
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <button 
            className="close-popup-btn"
            onClick={() => setGameResultPopup(null)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  // Component render functions
  const renderChoiceSelector = (onSelect, disabled = false, hideSelected = false) => (
    <div className="choice-selector">
      {[0, 1, 2].map(choice => (
        <button
          key={choice}
          className={`choice-btn ${!hideSelected && selectedChoice === choice ? 'selected' : ''}`}
          onClick={() => onSelect(choice)}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!disabled && !loading) {
              onSelect(choice);
            }
          }}
          disabled={disabled || loading}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="choice-icon">
            <img src={CHOICES[choice].icon} alt={CHOICES[choice].name} style={{ width: '60px', height: '60px' }} />
          </span>
          <span className="choice-name">{CHOICES[choice].name}</span>
        </button>
      ))}
    </div>
  );

  // Game card render
  const renderGameCard = (gameData) => {
    const { id, game } = gameData;
    const gameId = id.toString();
    const isPlayer1 = game.p1.toLowerCase() === account?.toLowerCase();
    const isPlayer2 = game.p2.toLowerCase() === account?.toLowerCase();
    
    return (
      <div key={gameId} className="game-card">
        <div className="game-header">
          <h3>Game #{gameId}</h3>
          <span className="game-state">{GAME_STATES[game.state]}</span>
        </div>
        
        <div className="game-info">
          <div className="bet-amount">
            Bet: {formatTokenAmount(game.bet)} tokens
          </div>
          <div className="players">
            <div className="player">
              Player 1: {formatAddress(game.p1)}
              {isPlayer1 && <span className="you-tag">YOU</span>}
            </div>
            {game.p2 !== ethers.constants.AddressZero && (
              <div className="player">
                Player 2: {formatAddress(game.p2)}
                {isPlayer2 && <span className="you-tag">YOU</span>}
              </div>
            )}
          </div>
        </div>
        
        <div className="game-actions">
          {game.state === 0 && account && !isPlayer1 && (
            <div className="join-game">
              {ethers.utils.parseEther(tokenBalance).gte(game.bet) ? (
                <>
                  <div className="choice-prompt">Choose your move:</div>
                  {renderChoiceSelector((choice) => joinGame(gameId, choice), false, true)}
                </>
              ) : (
                <div className="insufficient-balance">
                  <div className="insufficient-balance-text">
                    Insufficient balance to join this game
                  </div>
                  <div className="balance-requirement">
                    Required: {formatTokenAmount(game.bet)} tokens
                    <br />
                    Your balance: {parseFloat(tokenBalance).toFixed(4)} tokens
                  </div>
                </div>
              )}
            </div>
          )}
          
          {game.state === 0 && !account && (
            <div className="connect-to-join">
              <button onClick={connectWallet} className="connect-wallet-btn">
                Connect Wallet to Join Game
              </button>
            </div>
          )}
          
          {game.state === 0 && isPlayer1 && (
            <button 
              className="cancel-btn"
              onClick={() => cancelGame(gameId)}
              disabled={loading}
            >
              Cancel Game
            </button>
          )}
          
          {game.state === 1 && (
            <div className="auto-resolving">
              <div className="auto-resolve-text">
                Waiting for game resolution...
              </div>
            </div>
          )}
          
          {(game.state === 2 || game.state === 3 || game.state === 4) && (
            <div className="game-finished">
              <div className="finished-text">
                Game {GAME_STATES[game.state].toLowerCase()}
                {game.state === 4 && ': Both players refunded (no fee)'}
                {game.state === 2 && game.winner && `: Winner ${formatAddress(game.winner)}`}
                {game.autoResolved && " (Auto-resolved)"}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveGames = () => (
    <div className="games-section">
      <div className="section-header">
        <h2>Active Games ({activeGames.length})</h2>
        <div className="header-buttons">
          <button 
            className="refresh-btn"
            onClick={async () => {
              setLoading(true);
              try {
                if (account && contract && tokenContract) {
                  await loadGameData(contract, tokenContract, account);
                } else {
                  await loadPublicData();
                }
              } catch (error) {
                console.error('Refresh failed:', error);
                setError('Failed to refresh games');
              } finally {
                setLoading(false);
              }
            }}
            onTouchEnd={async (e) => {
              e.preventDefault();
              if (!loading) {
                setLoading(true);
                try {
                  if (account && contract && tokenContract) {
                    await loadGameData(contract, tokenContract, account);
                  } else {
                    await loadPublicData();
                  }
                } catch (error) {
                  console.error('Refresh failed:', error);
                  setError('Failed to refresh games');
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            title="Refresh game list"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
          <button 
            className="create-game-btn"
            onClick={() => setCurrentView('create')}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (account && networkCorrect) setCurrentView('create');
            }}
            disabled={!account || !networkCorrect}
            style={{ touchAction: 'manipulation' }}
          >
            Create New Game
          </button>
        </div>
      </div>
      
      {activeGames.length === 0 ? (
        <div className="empty-state">
          No active games. {account ? 'Create one to get started!' : 'Connect your wallet to create games.'}
        </div>
      ) : (
        <div className="games-grid">
          {activeGames.map(renderGameCard)}
        </div>
      )}
    </div>
  );

  const renderCreateGame = () => (
    <div className="create-game-section">
      <div className="section-header">
        <h2>Create New Game</h2>
        <button 
          className="back-btn"
          onClick={() => setCurrentView('games')}
        >
          Back to Games
        </button>
      </div>
      
      <div className="create-game-form">
        <div className="form-group">
          <label>Choose Your Move (Secret):</label>
          {renderChoiceSelector(setSelectedChoice)}
          {selectedChoice !== null && (
            <div className="selection-feedback">
              Selected: {CHOICES[selectedChoice].name} <img src={CHOICES[selectedChoice].icon} alt={CHOICES[selectedChoice].name} style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} />
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Bet Amount (tokens - Min: 5000):</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                setBetAmount(value);
              }
            }}
            placeholder="Enter bet amount (minimum 5000)"
            step="1"
            min="5000"
            onKeyPress={(e) => {
              if (e.key === '.' || e.key === ',') {
                e.preventDefault();
              }
            }}
          />
          <div className="balance-info">
            Balance: {parseFloat(tokenBalance).toFixed(0)} tokens
            <br />
            <span style={{ color: parseInt(betAmount || 0) < 5000 && betAmount ? '#ff4757' : '#a0a0a0' }}>
              Minimum bet: 5000 tokens (integers only)
            </span>
          </div>
        </div>
        
        <button 
          className="create-btn"
          onClick={createGame}
          disabled={
            (selectedChoice !== 0 && !selectedChoice) || 
            !betAmount || 
            parseInt(betAmount) < 5000 || 
            loading || 
            !account || 
            !networkCorrect
          }
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </div>
    </div>
  );

  const renderGameHistory = () => (
    <div className="history-section">
      <div className="section-header">
        <h2>Game History (Last 20)</h2>
      </div>
      
      {finishedGames.length === 0 ? (
        <div className="empty-state">
          No games completed yet.
        </div>
      ) : (
        <div className="history-list">
          {finishedGames.map(gameData => {
            const { id, game } = gameData;
            const gameId = id.toString();
            const isPlayer1 = game.p1.toLowerCase() === account?.toLowerCase();
            const isPlayer2 = game.p2.toLowerCase() === account?.toLowerCase();
            const isWinner = game.winner && game.winner.toLowerCase() === account?.toLowerCase();
            const isTie = game.state === 4;
            const isInvolved = isPlayer1 || isPlayer2;
            
            return (
              <div key={gameId} className="history-item">
                <div className="history-header">
                  <span className="game-id">Game #{gameId} {game.autoResolved && "⚡"}</span>
                  <span className={`result ${
                    isTie ? 'tie' : 
                    !isInvolved ? 'neutral' : 
                    isWinner ? 'won' : 'lost'
                  }`}>
                    {isTie ? 'TIE' : 
                     !isInvolved ? 'WATCHED' : 
                     isWinner ? 'WON' : 'LOST'}
                  </span>
                </div>
                <div className="history-details">
                  <div>Bet: {formatTokenAmount(game.bet)} tokens</div>
                  {!isTie && game.winner && <div>Winner: {formatAddress(game.winner)}</div>}
                  {isTie && <div>Result: Both players refunded (no fee)</div>}
                  <div>Players: {formatAddress(game.p1)} vs {formatAddress(game.p2)}</div>
                  {!isInvolved && <div style={{ color: '#f39c12' }}>👁️ You observed this game</div>}
                  {game.autoResolved && <div style={{ color: '#2ecc71' }}>⚡ Auto-resolved</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPlayerStats = () => (
    <div className="stats-section">
      <div className="section-header">
        <h2>Your Statistics</h2>
      </div>
      
      {playerStats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{playerStats.played.toString()}</div>
            <div className="stat-label">Games Played</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{playerStats.won.toString()}</div>
            <div className="stat-label">Games Won</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{playerStats.ties.toString()}</div>
            <div className="stat-label">Games Tied</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {playerStats.played.gt(0) 
                ? ((playerStats.won.toNumber() / playerStats.played.toNumber()) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="stat-label">Win Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatTokenAmount(playerStats.bet)}</div>
            <div className="stat-label">Total Bet</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatTokenAmount(playerStats.winnings)}</div>
            <div className="stat-label">Total Winnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {formatTokenAmount(playerStats.winnings.sub(playerStats.bet))}
            </div>
            <div className="stat-label">Net Profit</div>
          </div>
        </div>
      ) : (
        <div className="empty-state">Loading statistics...</div>
      )}
    </div>
  );

  // Network warning component
  const renderNetworkWarning = () => (
    <div className="network-warning">
      <div className="warning-content">
        <h3>⚠️ Wrong Network</h3>
        <p>Please switch to Avalanche Mainnet to continue</p>
        <button onClick={switchToAvalanche} className="switch-network-btn">
          Switch to Avalanche
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="rps-game-modal">
      <div className="rps-game-content">
        <div className="rps-header">
          <h1>Rock Paper GOATsors</h1>
          <div className="header-info">
            {!account ? (
              <button 
                className="connect-wallet-btn"
                onClick={connectWallet}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (!isConnecting) connectWallet();
                }}
                disabled={isConnecting}
                style={{ touchAction: 'manipulation' }}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="account-info">
                <span>Account: {formatAddress(account)}</span>
                {!networkCorrect && (
                  <span className="network-warning-badge">Wrong Network</span>
                )}
              </div>
            )}
            <button 
              className="close-btn" 
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                onClose();
              }}
              style={{ touchAction: 'manipulation' }}
            >✕</button>
          </div>
        </div>

        {account && !networkCorrect ? (
          <div className="rps-content">
            {renderNetworkWarning()}
          </div>
        ) : (
          <>
            <div className="rps-nav">
              {['games', 'create', 'history', 'stats'].map((view) => (
                <button 
                  key={view}
                  className={`nav-btn ${currentView === view ? 'active' : ''}`}
                  onClick={() => setCurrentView(view)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (view === 'create' || view === 'history' || view === 'stats') {
                      if (account) setCurrentView(view);
                    } else {
                      setCurrentView(view);
                    }
                  }}
                  disabled={!account && (view === 'create' || view === 'history' || view === 'stats')}
                  style={{ touchAction: 'manipulation' }}
                >
                  {view === 'games' && 'Active Games'}
                  {view === 'create' && 'Create Game'}
                  {view === 'history' && 'History'}
                  {view === 'stats' && 'Statistics'}
                </button>
              ))}
            </div>

            {error && (
              <div className="error-message">
                {error}
                <button 
                  onClick={() => setError('')}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setError('');
                  }}
                  style={{ touchAction: 'manipulation' }}
                >×</button>
              </div>
            )}

            <div className="rps-content">
              {loading && <div className="loading-overlay">Loading...</div>}
              
              {currentView === 'games' && renderActiveGames()}
              {currentView === 'create' && account && renderCreateGame()}
              {currentView === 'history' && account && renderGameHistory()}
              {currentView === 'stats' && account && renderPlayerStats()}
              
              {!account && currentView !== 'games' && (
                <div className="connect-prompt">
                  <h2>Connect Your Wallet</h2>
                  <p>Please connect your wallet to access this section.</p>
                  <button 
                    className="connect-wallet-btn large"
                    onClick={connectWallet}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (!isConnecting) connectWallet();
                    }}
                    disabled={isConnecting}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {renderGameResultPopup()}
      </div>
    </div>
  );
};

export default RockPaperScissors;

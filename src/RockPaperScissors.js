import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './RockPaperScissors.css';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

// Import PNG images (adjust paths as needed)
import winPng from './assets/win.png';
import losePng from './assets/lose.png';
import tiePng from './assets/tie.png';

// UPDATED CONTRACT ADDRESS - Your new deployed contract
const CONTRACT_ADDRESS = '0xF6Fe198eCeC3f2dc24f99bC5EFC898344EFfF99F';
const TOKEN_ADDRESS = '0xB9C188BC558a82a1eE9E75AE0857df443F407632';

// Avalanche network configuration
const AVALANCHE_NETWORK = {
  chainId: '0xA86A', // 43114 in hex
  chainName: 'Avalanche C-Chain',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://snowtrace.io/']
};

// New Contract ABI based on your provided ABI
const CONTRACT_ABI = [
  // Constructor
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  
  // Errors
  {"inputs":[{"internalType":"address","name":"have","type":"address"},{"internalType":"address","name":"want","type":"address"}],"name":"OnlyVRFWrapperCanFulfill","type":"error"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
  
  // Events
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"GameCancelled","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"p1","type":"address"},{"indexed":false,"internalType":"uint256","name":"bet","type":"uint256"},{"indexed":false,"internalType":"enum FauxRockPaperScissors.Choice","name":"p1Choice","type":"uint8"},{"indexed":false,"internalType":"enum FauxRockPaperScissors.PaymentType","name":"paymentType","type":"uint8"}],"name":"GameCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"p2","type":"address"},{"indexed":false,"internalType":"enum FauxRockPaperScissors.Choice","name":"p2Choice","type":"uint8"}],"name":"GameJoined","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"winnings","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isTie","type":"bool"}],"name":"GameResolved","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isMaxApproval","type":"bool"}],"name":"TokenApproval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"requestId","type":"uint256"}],"name":"VRFRequested","type":"event"},
  
  // Functions
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"active","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"activeGameIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_betAmount","type":"uint256"}],"name":"approveBetAmount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"approveMaxAmount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"callbackGasLimit","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"cancel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_betAmount","type":"uint256"}],"name":"checkApproval","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"enum FauxRockPaperScissors.Choice","name":"_choice","type":"uint8"}],"name":"createGameAVAX","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_bet","type":"uint256"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"_choice","type":"uint8"}],"name":"createGameERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"emergency","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"emergencyCancel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"fees","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"feesAVAX","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"finished","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"gameId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"gameToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"games","outputs":[{"internalType":"address","name":"p1","type":"address"},{"internalType":"address","name":"p2","type":"address"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"p1Choice","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"p2Choice","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.PaymentType","name":"paymentType","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.State","name":"state","type":"uint8"},{"internalType":"address","name":"winner","type":"address"},{"internalType":"uint256","name":"created","type":"uint256"},{"internalType":"uint256","name":"resolvedAt","type":"uint256"},{"internalType":"uint256","name":"vrfRequestId","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getActive","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getActiveCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getContractBalances","outputs":[{"internalType":"uint256","name":"tokenBalance","type":"uint256"},{"internalType":"uint256","name":"avaxBalance","type":"uint256"},{"internalType":"uint256","name":"fees_","type":"uint256"},{"internalType":"uint256","name":"feesAVAX_","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_limit","type":"uint256"}],"name":"getFinished","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getFinishedCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"getGame","outputs":[{"components":[{"internalType":"address","name":"p1","type":"address"},{"internalType":"address","name":"p2","type":"address"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"p1Choice","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"p2Choice","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.PaymentType","name":"paymentType","type":"uint8"},{"internalType":"enum FauxRockPaperScissors.State","name":"state","type":"uint8"},{"internalType":"address","name":"winner","type":"address"},{"internalType":"uint256","name":"created","type":"uint256"},{"internalType":"uint256","name":"resolvedAt","type":"uint256"},{"internalType":"uint256","name":"vrfRequestId","type":"uint256"}],"internalType":"struct FauxRockPaperScissors.Game","name":"","type":"tuple"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getLinkToken","outputs":[{"internalType":"contract LinkTokenInterface","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_player","type":"address"}],"name":"getPlayerActiveGames","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_player","type":"address"}],"name":"getStats","outputs":[{"components":[{"internalType":"uint256","name":"played","type":"uint256"},{"internalType":"uint256","name":"won","type":"uint256"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"uint256","name":"winnings","type":"uint256"},{"internalType":"uint256","name":"ties","type":"uint256"}],"internalType":"struct FauxRockPaperScissors.Stats","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"houseFeePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"i_vrfV2PlusWrapper","outputs":[{"internalType":"contract IVRFV2PlusWrapper","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"},{"internalType":"enum FauxRockPaperScissors.Choice","name":"_choice","type":"uint8"}],"name":"joinGame","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[],"name":"minBetAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"minVrfBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"numWords","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"playerActiveGames","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_requestId","type":"uint256"},{"internalType":"uint256[]","name":"_randomWords","type":"uint256[]"}],"name":"rawFulfillRandomWords","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"requestConfirmations","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_gameToken","type":"address"},{"internalType":"uint256","name":"_houseFee","type":"uint256"},{"internalType":"uint256","name":"_minBet","type":"uint256"},{"internalType":"uint32","name":"_callbackGasLimit","type":"uint32"},{"internalType":"uint16","name":"_requestConfirmations","type":"uint16"},{"internalType":"uint256","name":"_minVrfBalance","type":"uint256"}],"name":"setConfig","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bool","name":"_paused","type":"bool"}],"name":"setPaused","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stats","outputs":[{"internalType":"uint256","name":"played","type":"uint256"},{"internalType":"uint256","name":"won","type":"uint256"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"uint256","name":"winnings","type":"uint256"},{"internalType":"uint256","name":"ties","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"vrfRequestToGameId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"}
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
  3: 'Cancelled'
};

// Updated Choices - 0 is no longer a valid choice
const CHOICES = {
  1: { name: 'Rock', emoji: '🪨', icon: './rock.png' },
  2: { name: 'Paper', emoji: '📄', icon: './paper.png' },
  3: { name: 'Scissors', emoji: '✂️', icon: './scissors.png' }
};

// Payment types
const PAYMENT_TYPES = {
  0: 'ERC20',
  1: 'AVAX'
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
  const [avaxBalance, setAvaxBalance] = useState('0');
  const [tokenAllowance, setTokenAllowance] = useState('0');
  const [gameResultPopup, setGameResultPopup] = useState(null);
  const [paymentType, setPaymentType] = useState('ERC20'); // 'ERC20' or 'AVAX'
  const [minBetAmount, setMinBetAmount] = useState('0');
  
  // Enhanced statistics state
  const [activeStatsSection, setActiveStatsSection] = useState('summary');
  const [winRateHistory, setWinRateHistory] = useState([]);
  const [statsFilter, setStatsFilter] = useState('erc20'); // 'erc20', 'avax'

  // Mobile-specific state
  const [isMobile, setIsMobile] = useState(false);

  // Refs for cleanup
  const eventListenersRef = useRef(new Map());
  const intervalsRef = useRef(new Map());
  const winRateHistoryRef = useRef(null);
  
  // Mock data for choice statistics
  const choiceStats = {
    yours: [35, 40, 25], // Rock, Paper, Scissors percentages
    opponents: [30, 45, 25] // Rock, Paper, Scissors percentages
  };

  // MetaMask detection helper
  const isMetaMask = () => {
    return window.ethereum && window.ethereum.isMetaMask;
  };

  // Gas estimation helper function - Updated with 50% buffer for MetaMask
  const getGasLimitWithBuffer = async (contract, methodName, params, isMetaMask = false) => {
    try {
      // Get gas estimate
      const estimatedGas = await contract.estimateGas[methodName](...params);
      
      // 50% buffer for MetaMask, 10% for others
      const buffer = isMetaMask ? 150 : 110;
      const gasWithBuffer = estimatedGas.mul(buffer).div(100);
      
      console.log(`Gas estimation for ${methodName}:`, {
        estimated: estimatedGas.toString(),
        withBuffer: gasWithBuffer.toString(),
        buffer: `${buffer - 100}%`,
        wallet: isMetaMask ? 'MetaMask' : 'Other'
      });
      
      return gasWithBuffer;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // Fallback gas limit
      return isMetaMask ? ethers.BigNumber.from("800000") : ethers.BigNumber.from("500000");
    }
  };

  // MetaMask direct transaction helper
  const sendMetaMaskTransaction = async (to, data, value = '0x0') => {
    try {
      const params = [{
        from: account,
        to: to,
        data: data,
        value: value,
        gas: '0xC3500' // 800,000 in hex
      }];

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: params,
      });

      // Wait for transaction receipt
      let receipt = null;
      while (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        receipt = await provider.getTransactionReceipt(txHash);
      }

      return receipt;
    } catch (error) {
      console.error('MetaMask direct transaction failed:', error);
      throw error;
    }
  };

  // Generate win rate history data
  useEffect(() => {
    if (playerStats && finishedGames && finishedGames.length > 0) {
      if (!winRateHistoryRef.current || winRateHistoryRef.current.accountId !== account) {
        const currentWinRate = playerStats.played.gt(0) 
          ? (playerStats.won.toNumber() / playerStats.played.toNumber()) * 100
          : 50;
        
        const historyData = Array.from({ length: 12 }, (_, i) => {
          const seed = account ? parseInt(account.slice(-8), 16) : 0;
          const hash = (seed + i * 7919) % 21 - 10;
          const rate = (i === 11) 
            ? currentWinRate 
            : Math.max(0, Math.min(100, currentWinRate + hash));
          
          return {
            index: i + 1,
            rate: parseFloat(rate.toFixed(1))
          };
        });
        
        winRateHistoryRef.current = {
          data: historyData,
          accountId: account
        };
      }
      
      setWinRateHistory(winRateHistoryRef.current.data);
    }
  }, [playerStats, finishedGames, account]);

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

  // Check if already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
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
                  await loadPublicData(false);
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

  // Load public data (all active games) even without wallet connection
  const loadPublicData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const publicProvider = new ethers.providers.JsonRpcProvider(AVALANCHE_NETWORK.rpcUrls[0]);
      const publicContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicProvider);
      
      const activeIds = await publicContract.getActive();
      const activeGamesData = await Promise.all(
        activeIds.map(async (id) => {
          const [game] = await publicContract.getGame(id);
          return { id: id.toString(), game };
        })
      );
      
      // Filter out games that are in "Joined" state for non-connected users
      const filteredGames = activeGamesData.filter(gameData => {
        const { game } = gameData;
        
        if (!account) {
          return game.state === 0;
        }
        
        const isPlayer1 = game.p1.toLowerCase() === account.toLowerCase();
        const isPlayer2 = game.p2.toLowerCase() === account.toLowerCase();
        const isInvolved = isPlayer1 || isPlayer2;
        
        return game.state === 0 || isInvolved;
      });
      
      setActiveGames(filteredGames);
      
    } catch (error) {
      console.error('Failed to load public data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
    
    intervalsRef.current.forEach((interval) => {
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
        
        // Refresh provider for MetaMask
        if (isMetaMask()) {
          const newProvider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(newProvider);
          setSigner(newProvider.getSigner());
        }
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
        await loadGameData(gameContract, tokenContract, account, false);
        setupEventListeners(gameContract);
        
        // MetaMask harici cüzdanlar için otomatik refresh
        if (!isMetaMask()) {
          console.log('Non-MetaMask wallet detected, auto-refreshing in 2 seconds...');
          
          // 2 saniye sonra refresh yap
          setTimeout(async () => {
            try {
              await loadGameData(gameContract, tokenContract, account, false);
              console.log('Auto-refresh completed for non-MetaMask wallet');
            } catch (error) {
              console.error('Auto-refresh failed:', error);
            }
          }, 2000);
        }
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
      loadGameData(contract, tokenContract, account, false);
      setupEventListeners(contract);
      
      const refreshInterval = setInterval(async () => {
        try {
          await loadGameData(contract, tokenContract, account, false);
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
      'GameJoined', 
      'GameResolved',
      'GameCancelled',
      'VRFRequested'
    ];
    
    const autoRefresh = async (delay = 2000) => {
      setTimeout(async () => {
        try {
          if (account && contract && tokenContract) {
            await loadGameData(contract, tokenContract, account, false);
          } else {
            await loadPublicData(false);
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
        
        if (eventName === 'GameJoined') {
          autoRefresh(1500);
        }
        
        if (eventName === 'VRFRequested') {
          autoRefresh(1000);
        }
        
        // Handle resolved games
        if (eventName === 'GameResolved') {
          const [gameId, winner, winnings, isTie] = args;
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
                const isAVAXGame = gameDetails.paymentType === 1;
                
                if (isTie) {
                  setGameResultPopup({
                    gameId: gameIdStr,
                    result: 'tie',
                    refundAmount: gameDetails.bet,
                    playerChoice: isPlayer1 ? gameDetails.p1Choice : gameDetails.p2Choice,
                    opponentChoice: isPlayer1 ? gameDetails.p2Choice : gameDetails.p1Choice,
                    betAmount: gameDetails.bet,
                    isAVAXGame: isAVAXGame
                  });
                } else {
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
                    isAVAXGame: isAVAXGame
                  });
                }
              }
            } catch (error) {
              console.error('Error fetching game details for popup:', error);
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
  const loadGameData = async (gameContract, tokenContract, userAccount, showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Get active games
      const activeIds = await gameContract.getActive();
      const activeGamesData = await Promise.all(
        activeIds.map(async (id) => {
          const [game] = await gameContract.getGame(id);
          return { id: id.toString(), game };
        })
      );
      
      // Filter active games
      const filteredActiveGames = activeGamesData.filter(gameData => {
        const { game } = gameData;
        
        if (game.state === 0) {
          return true;
        }
        
        if (game.state === 1) {
          const isPlayer1 = game.p1.toLowerCase() === userAccount.toLowerCase();
          const isPlayer2 = game.p2.toLowerCase() === userAccount.toLowerCase();
          return isPlayer1 || isPlayer2;
        }
        
        return false;
      });
      
      setActiveGames(filteredActiveGames);
      
      // Get finished games
      const finishedIds = await gameContract.getFinished(20);
      const finishedGamesData = await Promise.all(
        finishedIds.map(async (id) => {
          const [game] = await gameContract.getGame(id);
          return { id: id.toString(), game };
        })
      );
      setFinishedGames(finishedGamesData);
      
      // Get player stats
      const stats = await gameContract.getStats(userAccount);
      setPlayerStats(stats);
      
      // Get balances
      const balance = await tokenContract.balanceOf(userAccount);
      const allowance = await tokenContract.allowance(userAccount, CONTRACT_ADDRESS);
      const avaxBal = await provider.getBalance(userAccount);
      
      setTokenBalance(ethers.utils.formatEther(balance));
      setTokenAllowance(ethers.utils.formatEther(allowance));
      setAvaxBalance(ethers.utils.formatEther(avaxBal));
      
      // Get minimum bet amount
      const minBet = await gameContract.minBetAmount();
      setMinBetAmount(ethers.utils.formatEther(minBet));
      
    } catch (error) {
      console.error('Failed to load game data:', error);
      setError('Failed to load game data');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Create game function (ERC20)
  const createGameERC20 = async () => {
    if (!selectedChoice) {
      setError('Please select your move');
      return;
    }
    
    if (!betAmount || parseFloat(betAmount) <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }
    
    const minBetFloat = parseFloat(minBetAmount);
    if (parseFloat(betAmount) < minBetFloat) {
      setError(`Minimum bet amount is ${minBetFloat} GOAT`);
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
      const usingMetaMask = isMetaMask();
      
      // Check and approve tokens if needed
      const currentAllowance = ethers.BigNumber.from(ethers.utils.parseEther(tokenAllowance));
      if (currentAllowance.lt(betWei)) {
        // Approve with 50% gas buffer for MetaMask
        const approveGasLimit = usingMetaMask 
          ? await getGasLimitWithBuffer(tokenContract, 'approve', [CONTRACT_ADDRESS, betWei], true)
          : undefined;
        
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, betWei, 
          approveGasLimit ? { gasLimit: approveGasLimit } : {}
        );
        await approveTx.wait();
        
        // Wait 3 seconds for MetaMask
        if (usingMetaMask) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const newAllowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
        setTokenAllowance(ethers.utils.formatEther(newAllowance));
      }
      
      // Create game with ERC20 tokens - 50% gas buffer for MetaMask
      let tx;
      if (usingMetaMask) {
        const gasLimit = await getGasLimitWithBuffer(
          contract, 
          'createGameERC20', 
          [betWei, selectedChoice], 
          true
        );
        
        tx = await contract.createGameERC20(betWei, selectedChoice, { gasLimit });
      } else {
        // Other wallets normal transaction
        tx = await contract.createGameERC20(betWei, selectedChoice);
      }
      
      await tx.wait();
      
      setSelectedChoice(null);
      setBetAmount('');
      setCurrentView('games');
      
      await loadGameData(contract, tokenContract, account, false);
      
    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Create game function (AVAX)
  const createGameAVAX = async () => {
    if (!selectedChoice) {
      setError('Please select your move');
      return;
    }
    
    if (!betAmount || parseFloat(betAmount) <= 0) {
      setError('Please enter a valid bet amount');
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
      const usingMetaMask = isMetaMask();
      
      // Create game with AVAX - 50% gas buffer for MetaMask
      let tx;
      if (usingMetaMask) {
        const gasLimit = await getGasLimitWithBuffer(
          contract, 
          'createGameAVAX', 
          [selectedChoice], 
          true
        );
        
        tx = await contract.createGameAVAX(selectedChoice, { 
          value: betWei,
          gasLimit: gasLimit 
        });
      } else {
        // Other wallets normal transaction
        tx = await contract.createGameAVAX(selectedChoice, { value: betWei });
      }
      
      await tx.wait();
      
      setSelectedChoice(null);
      setBetAmount('');
      setCurrentView('games');
      
      await loadGameData(contract, tokenContract, account, false);
      
    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Create game wrapper function
  const createGame = async () => {
    if (paymentType === 'AVAX') {
      await createGameAVAX();
    } else {
      await createGameERC20();
    }
  };

  // Join existing game - Updated with MetaMask fixes
  const joinGame = async (gameId, choice, game) => {
    if (!contract || !tokenContract) return;
    
    try {
      setLoading(true);
      setError('');
      
      const betAmount = game.bet;
      const isAVAXGame = game.paymentType === 1;
      const usingMetaMask = isMetaMask();
      
      if (isAVAXGame) {
        // Join with AVAX
        let tx;
        if (usingMetaMask) {
          // Try direct MetaMask transaction for problematic cases
          try {
            const gasLimit = await getGasLimitWithBuffer(
              contract, 
              'joinGame', 
              [gameId, choice], 
              true
            );
            
            tx = await contract.joinGame(gameId, choice, { 
              value: betAmount,
              gasLimit: gasLimit 
            });
          } catch (error) {
            console.log('Trying direct MetaMask transaction...');
            // If regular method fails, use direct MetaMask API
            const iface = new ethers.utils.Interface(CONTRACT_ABI);
            const data = iface.encodeFunctionData('joinGame', [gameId, choice]);
            
            const receipt = await sendMetaMaskTransaction(
              CONTRACT_ADDRESS,
              data,
              ethers.utils.hexValue(betAmount)
            );
            
            if (receipt.status === 1) {
              await loadGameData(contract, tokenContract, account, false);
              return;
            } else {
              throw new Error('Transaction failed');
            }
          }
        } else {
          tx = await contract.joinGame(gameId, choice, { value: betAmount });
        }
        
        if (tx) {
          await tx.wait();
        }
      } else {
        // Join with ERC20 tokens
        const balance = await tokenContract.balanceOf(account);
        if (balance.lt(betAmount)) {
          setError(`Insufficient balance. You need ${formatTokenAmount(betAmount)} GOAT to join this game.`);
          return;
        }
        
        const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
        if (allowance.lt(betAmount)) {
          // Approve with 50% gas buffer for MetaMask
          const approveGasLimit = usingMetaMask 
            ? await getGasLimitWithBuffer(tokenContract, 'approve', [CONTRACT_ADDRESS, betAmount], true)
            : undefined;
          
          const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, betAmount,
            approveGasLimit ? { gasLimit: approveGasLimit } : {}
          );
          await approveTx.wait();
          
          // Wait 3 seconds for MetaMask
          if (usingMetaMask) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          const newAllowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
          setTokenAllowance(ethers.utils.formatEther(newAllowance));
        }
        
        // Join game
        let tx;
        if (usingMetaMask) {
          try {
            const gasLimit = await getGasLimitWithBuffer(
              contract, 
              'joinGame', 
              [gameId, choice], 
              true
            );
            
            tx = await contract.joinGame(gameId, choice, { gasLimit });
          } catch (error) {
            console.log('Trying direct MetaMask transaction for ERC20...');
            // If regular method fails, use direct MetaMask API
            const iface = new ethers.utils.Interface(CONTRACT_ABI);
            const data = iface.encodeFunctionData('joinGame', [gameId, choice]);
            
            const receipt = await sendMetaMaskTransaction(CONTRACT_ADDRESS, data);
            
            if (receipt.status === 1) {
              await loadGameData(contract, tokenContract, account, false);
              return;
            } else {
              throw new Error('Transaction failed');
            }
          }
        } else {
          tx = await contract.joinGame(gameId, choice);
        }
        
        if (tx) {
          await tx.wait();
        }
      }
      
      await loadGameData(contract, tokenContract, account, false);
      
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
      
      const usingMetaMask = isMetaMask();
      
      let tx;
      if (usingMetaMask) {
        const gasLimit = await getGasLimitWithBuffer(
          contract, 
          'cancel', 
          [gameId], 
          true
        );
        
        tx = await contract.cancel(gameId, { gasLimit });
      } else {
        tx = await contract.cancel(gameId);
      }
      
      await tx.wait();
      
      await loadGameData(contract, tokenContract, account, false);
      
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

  // Format AVAX amount
  const formatAvaxAmount = (amount) => {
    return parseFloat(ethers.utils.formatEther(amount)).toFixed(4);
  };

  // Get currency symbol
  const getCurrencySymbol = (paymentType) => {
    return paymentType === 1 ? 'AVAX' : 'GOAT';
  };

  // Game result popup component
  const renderGameResultPopup = () => {
    if (!gameResultPopup) return null;
    
    const { gameId, result } = gameResultPopup;
    
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
                <p>Refund issued</p>
              </>
            )}
          </div>
          
          <div className="result-details">
            <div className="game-info">
              <p><strong>Game #:</strong> {gameId}</p>
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
      {[1, 2, 3].map(choice => (
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
    const isAVAXGame = game.paymentType === 1;
    
    return (
      <div key={gameId} className="game-card">
        <div className="game-header">
          <h3>Game #{gameId}</h3>
          <span className="game-state">{GAME_STATES[game.state]}</span>
        </div>
        
        <div className="game-info">
          <div className="bet-amount">
            Bet: {isAVAXGame ? formatAvaxAmount(game.bet) : formatTokenAmount(game.bet)} {getCurrencySymbol(game.paymentType)}
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
              {(isAVAXGame ? ethers.utils.parseEther(avaxBalance).gte(game.bet) : ethers.utils.parseEther(tokenBalance).gte(game.bet)) ? (
                <>
                  <div className="choice-prompt">Choose your move:</div>
                  {renderChoiceSelector((choice) => joinGame(gameId, choice, game), false, true)}
                </>
              ) : (
                <div className="insufficient-balance">
                  <div className="insufficient-balance-text">
                    Insufficient balance to join this game
                  </div>
                  <div className="balance-requirement">
                    Required: {isAVAXGame ? formatAvaxAmount(game.bet) : formatTokenAmount(game.bet)} {getCurrencySymbol(game.paymentType)}
                    <br />
                    Your balance: {isAVAXGame ? formatAvaxAmount(ethers.utils.parseEther(avaxBalance)) : parseFloat(tokenBalance).toFixed(0)} {getCurrencySymbol(game.paymentType)}
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
                Waiting for VRF resolution...
              </div>
            </div>
          )}
          
          {(game.state === 2 || game.state === 3) && (
            <div className="game-finished">
              <div className="finished-text">
                Game {GAME_STATES[game.state].toLowerCase()}
                {game.state === 2 && game.winner && `: Winner ${formatAddress(game.winner)}`}
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
                  await loadGameData(contract, tokenContract, account, true);
                } else {
                  await loadPublicData(true);
                }
              } catch (error) {
                console.error('Refresh failed:', error);
                setError('Failed to refresh games');
              }
            }}
            onTouchEnd={async (e) => {
              e.preventDefault();
              if (!loading) {
                setLoading(true);
                try {
                  if (account && contract && tokenContract) {
                    await loadGameData(contract, tokenContract, account, true);
                  } else {
                    await loadPublicData(true);
                  }
                } catch (error) {
                  console.error('Refresh failed:', error);
                  setError('Failed to refresh games');
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
          <label>Game Type:</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              className={`choice-btn ${paymentType === 'ERC20' ? 'selected' : ''}`}
              onClick={() => setPaymentType('ERC20')}
              style={{ flex: 1 }}
            >
              <span className="choice-name">GOAT</span>
            </button>
            <button
              className={`choice-btn ${paymentType === 'AVAX' ? 'selected' : ''}`}
              onClick={() => setPaymentType('AVAX')}
              style={{ flex: 1 }}
            >
              <span className="choice-name">AVAX</span>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Choose Your Move:</label>
          {renderChoiceSelector(setSelectedChoice)}
          {selectedChoice !== null && (
            <div className="selection-feedback">
              Selected: {CHOICES[selectedChoice].name} <img src={CHOICES[selectedChoice].icon} alt={CHOICES[selectedChoice].name} style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} />
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Bet Amount ({paymentType === 'AVAX' ? 'AVAX' : 'GOAT'}):</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder={`Enter bet amount${paymentType === 'ERC20' && minBetAmount ? ` (minimum ${parseFloat(minBetAmount)})` : ''}`}
            step="0.001"
            min={paymentType === 'ERC20' ? minBetAmount : '0.001'}
          />
          <div className="balance-info">
            Balance: {paymentType === 'AVAX' ? parseFloat(avaxBalance).toFixed(4) : parseFloat(tokenBalance).toFixed(0)} {paymentType === 'AVAX' ? 'AVAX' : 'GOAT'}
            {paymentType === 'ERC20' && minBetAmount && (
              <>
                <br />
                <span style={{ color: parseFloat(betAmount || 0) < parseFloat(minBetAmount) && betAmount ? '#ff4757' : '#a0a0a0' }}>
                  Minimum bet: {parseFloat(minBetAmount)} GOAT
                </span>
              </>
            )}
          </div>
        </div>
        
        <button 
          className="create-btn"
          onClick={createGame}
          disabled={
            !selectedChoice || 
            !betAmount || 
            (paymentType === 'ERC20' && parseFloat(betAmount) < parseFloat(minBetAmount)) ||
            (paymentType === 'AVAX' && parseFloat(betAmount) <= 0) ||
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
            const isTie = game.state === 2 && game.winner === ethers.constants.AddressZero;
            const isInvolved = isPlayer1 || isPlayer2;
            
            return (
              <div key={gameId} className="history-item">
                <div className="history-header">
                  <span className="game-id">Game #{gameId}</span>
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
                  <div>Bet: {game.paymentType === 1 ? formatAvaxAmount(game.bet) : formatTokenAmount(game.bet)} {getCurrencySymbol(game.paymentType)}</div>
                  {!isTie && game.winner && <div>Winner: {formatAddress(game.winner)}</div>}
                  {isTie && <div>Result: Both players refunded (no fee)</div>}
                  <div>Players: {formatAddress(game.p1)} vs {formatAddress(game.p2)}</div>
                  {!isInvolved && <div style={{ color: '#f39c12' }}>👁️ You observed this game</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderEnhancedPlayerStats = () => {
    const colors = {
      primary: '#FF6B35',
      secondary: '#F7931E',
      win: '#27ae60',
      loss: '#ff4757',
      tie: '#f1c40f',
      dark: '#1a1a1a',
      darkAccent: '#333333',
      light: '#a0a0a0'
    };

    // Filter finished games based on payment type
    const filteredFinishedGames = finishedGames.filter(gameData => {
      const { game } = gameData;
      const isPlayer1 = game.p1.toLowerCase() === account?.toLowerCase();
      const isPlayer2 = game.p2.toLowerCase() === account?.toLowerCase();
      const isInvolved = isPlayer1 || isPlayer2;
      
      if (!isInvolved) return false;
      
      if (statsFilter === 'erc20' && game.paymentType === 0) return true;
      if (statsFilter === 'avax' && game.paymentType === 1) return true;
      return false;
    });

    // Calculate stats from filtered games
    const calculateFilteredStats = () => {
      let played = 0;
      let won = 0;
      let ties = 0;
      let totalBet = ethers.BigNumber.from(0);
      let totalWinnings = ethers.BigNumber.from(0);
    
      filteredFinishedGames.forEach(gameData => {
        const { game } = gameData;
        const isPlayer1 = game.p1.toLowerCase() === account?.toLowerCase();
        const isPlayer2 = game.p2.toLowerCase() === account?.toLowerCase();
        
        // Tie kontrolü - winner adresi 0x0000... ise tie'dır
        const isTie = game.winner === ethers.constants.AddressZero || 
                      game.winner === '0x0000000000000000000000000000000000000000';
        
        const isWinner = !isTie && game.winner && game.winner.toLowerCase() === account?.toLowerCase();
        
        played++;
        
        if (isTie) {
          ties++;
          // Tie durumunda oyuncular bahislerini geri alır
          totalWinnings = totalWinnings.add(game.bet);
        } else if (isWinner) {
          won++;
          // Kazanan durumunda
          const houseFee = game.bet.mul(5).div(100); // %5 house fee varsayımı
          const winAmount = game.bet.mul(2).sub(houseFee);
          totalWinnings = totalWinnings.add(winAmount);
        }
        // Kaybeden durumunda totalWinnings'e bir şey eklenmez
        
        totalBet = totalBet.add(game.bet);
      });
    
      return { played, won, ties, totalBet, totalWinnings };
    };
    const filteredStats = calculateFilteredStats();

    const winRate = filteredStats.played > 0 
      ? ((filteredStats.won / filteredStats.played) * 100).toFixed(1)
      : 0;

      const gameOutcomeData = [
        { name: 'Won', value: filteredStats.won || 0, color: colors.win },
        { name: 'Lost', value: Math.max(0, (filteredStats.played || 0) - (filteredStats.won || 0) - (filteredStats.ties || 0)), color: colors.loss },
        { name: 'Tied', value: filteredStats.ties || 0, color: colors.tie }
      ];

    const recentGames = filteredFinishedGames.slice(0, 10);

    return (
      <div className="enhanced-statistics">
        {/* Stats Filter Buttons */}
        <div className="stats-filter-buttons">
          <button 
            className={`filter-btn ${statsFilter === 'erc20' ? 'active' : ''}`}
            onClick={() => setStatsFilter('erc20')}
          >
            <span style={{ fontWeight: 'bold' }}>GOAT</span> Games
          </button>
          <button 
            className={`filter-btn ${statsFilter === 'avax' ? 'active' : ''}`}
            onClick={() => setStatsFilter('avax')}
          >
            <span style={{ fontWeight: 'bold' }}>AVAX</span> Games
          </button>
        </div>

        <div className="stats-tabs">
          <button 
            className={`stats-tab ${activeStatsSection === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveStatsSection('summary')}
          >
            Summary Statistics
          </button>
          <button 
            className={`stats-tab ${activeStatsSection === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveStatsSection('recent')}
          >
            Recent Games
          </button>
          <button 
            className={`stats-tab ${activeStatsSection === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveStatsSection('analysis')}
          >
            Performance Analysis
          </button>
        </div>

        {/* Summary Statistics */}
        {activeStatsSection === 'summary' && (
          <div className="stats-summary">
            <div className="stats-cards">
              <div className="stats-grid">
                {/* Game Statistics */}
                <div className="stat-card enhanced">
                  <div className="stat-icon">🎮</div>
                  <div className="stat-value">{filteredStats.played}</div>
                  <div className="stat-label">Games Played</div>
                </div>
                
                <div className="stat-card enhanced">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-value">{filteredStats.won}</div>
                  <div className="stat-label">Games Won</div>
                </div>
                
                <div className="stat-card enhanced">
                  <div className="stat-icon">🤝</div>
                  <div className="stat-value">{filteredStats.ties}</div>
                  <div className="stat-label">Games Tied</div>
                  <div className="stat-progress-bar">
                    <div 
                      className="stat-progress" 
                      style={{ 
                        width: `${filteredStats.played > 0 ? (filteredStats.ties / filteredStats.played) * 100 : 0}%`,
                        backgroundColor: colors.tie 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="stat-card enhanced">
                  <div className="stat-icon">📊</div>
                  <div className="stat-value">{winRate}%</div>
                  <div className="stat-label">Win Rate</div>
                  <div className="stat-progress-bar">
                    <div 
                      className="stat-progress" 
                      style={{ 
                        width: `${winRate}%`,
                        backgroundColor: parseFloat(winRate) > 50 ? colors.win : colors.loss
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                {/* Financial Statistics */}
                <div className="stat-card finance">
                  <div className="stat-icon">💰</div>
                  <div className="stat-value">
                    {statsFilter === 'avax' ?
                      formatAvaxAmount(filteredStats.totalBet) :
                      formatTokenAmount(filteredStats.totalBet)
                    }
                  </div>
                  <div className="stat-label">Total Bet ({statsFilter === 'avax' ? 'AVAX' : 'GOAT'})</div>
                </div>
                
                <div className="stat-card finance">
                  <div className="stat-icon">💸</div>
                  <div className="stat-value">
                    {statsFilter === 'avax' ?
                      formatAvaxAmount(filteredStats.totalWinnings) :
                      formatTokenAmount(filteredStats.totalWinnings)
                    }
                  </div>
                  <div className="stat-label">Total Winnings ({statsFilter === 'avax' ? 'AVAX' : 'GOAT'})</div>
                </div>
                
                <div className="stat-card finance">
                  <div className="stat-icon">📈</div>
                  <div className="stat-value" style={{ 
                    color: filteredStats.totalWinnings.gt(filteredStats.totalBet) ? colors.win : colors.loss
                  }}>
                    {filteredStats.totalWinnings.gt(filteredStats.totalBet) ? '+' : ''}
                    {statsFilter === 'avax' ?
                      formatAvaxAmount(filteredStats.totalWinnings.sub(filteredStats.totalBet)) :
                      formatTokenAmount(filteredStats.totalWinnings.sub(filteredStats.totalBet))
                    }
                  </div>
                  <div className="stat-label">Net Profit ({statsFilter === 'avax' ? 'AVAX' : 'GOAT'})</div>
                </div>
              </div>
            </div>

            {/* Pie chart */}
            <div className="stats-chart-container">
              <h3 className="stats-chart-title">Game Outcome Distribution ({statsFilter === 'avax' ? 'AVAX Games' : 'GOAT Games'})</h3>
              <div className="stats-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gameOutcomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {gameOutcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} games`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Recent Games */}
        {activeStatsSection === 'recent' && (
          <div className="recent-games-section">
            <h3 className="stats-section-title">Recent Games ({statsFilter === 'avax' ? 'AVAX' : 'GOAT'})</h3>
            
            {recentGames.length === 0 ? (
              <div className="no-games-message">No completed {statsFilter === 'avax' ? 'AVAX' : 'GOAT'} games yet.</div>
            ) : (
              <div className="recent-games-grid">
                {recentGames.map((gameData) => {
                  const { id, game } = gameData;
                  const gameId = id.toString();
                  const isPlayer1 = game.p1.toLowerCase() === account?.toLowerCase();
                  const isPlayer2 = game.p2.toLowerCase() === account?.toLowerCase();
                  const isInvolved = isPlayer1 || isPlayer2;
                  
                  if (!isInvolved) return null;
                  
                  const isWinner = game.winner && game.winner.toLowerCase() === account?.toLowerCase();
                  const isTie = game.winner === ethers.constants.AddressZero || 
                  game.winner === '0x0000000000000000000000000000000000000000';
                  
                  let resultClass = 'neutral';
                  if (isInvolved) {
                    resultClass = isTie ? 'tie' : (isWinner ? 'won' : 'lost');
                  }
                  
                  let resultText = 'WATCHED';
                  if (isInvolved) {
                    resultText = isTie ? 'TIE' : (isWinner ? 'WON' : 'LOST');
                  }
                  
                  return (
                    <div key={gameId} className={`recent-game-card ${resultClass}`}>
                      <div className="recent-game-header">
                        <div className="recent-game-id">Game #{gameId}</div>
                        <div className={`recent-game-result ${resultClass}`}>{resultText}</div>
                      </div>
                      <div className="recent-game-details">
                        <div className="recent-game-players">
                          <div className="player-tag">
                            <span className="player-address">{formatAddress(game.p1)}</span>
                            {isPlayer1 && <span className="player-you-tag">YOU</span>}
                          </div>
                          <div className="vs-label">VS</div>
                          <div className="player-tag">
                            <span className="player-address">{formatAddress(game.p2)}</span>
                            {isPlayer2 && <span className="player-you-tag">YOU</span>}
                          </div>
                        </div>
                        <div className="recent-game-bet">
                          Bet: {game.paymentType === 1 ? formatAvaxAmount(game.bet) : formatTokenAmount(game.bet)} {getCurrencySymbol(game.paymentType)}
                        </div>
                        {!isTie && game.winner && (
                          <div className="recent-game-winner">
                            Winner: {formatAddress(game.winner)}
                            {isWinner && <span className="player-you-tag">YOU</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Performance Analysis */}
        {activeStatsSection === 'analysis' && (
          <div className="performance-analysis">
            <div className="analysis-section">
              <h3 className="stats-section-title">Win Rate History ({statsFilter === 'avax' ? 'AVAX Games' : 'GOAT Games'})</h3>
              <div className="analysis-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={winRateHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.darkAccent} />
                    <XAxis dataKey="index" tick={false} />
                    <YAxis tick={{ fill: colors.light }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: colors.dark,
                        borderColor: colors.primary,
                        color: "#fff"
                      }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Win Rate']}
                      labelFormatter={() => 'Win Rate'} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      name="Win Rate" 
                      stroke={colors.primary}
                      strokeWidth={3}
                      dot={{ stroke: colors.primary, strokeWidth: 2, r: 4, fill: colors.dark }}
                      activeDot={{ stroke: colors.secondary, strokeWidth: 2, r: 6, fill: colors.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="analysis-section">
              <h3 className="stats-section-title">Favorite Choices Analysis</h3>
              <div className="analysis-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'Rock', yours: choiceStats.yours[0] || 0, opponents: choiceStats.opponents[0] || 0 },
                      { name: 'Paper', yours: choiceStats.yours[1] || 0, opponents: choiceStats.opponents[1] || 0 },
                      { name: 'Scissors', yours: choiceStats.yours[2] || 0, opponents: choiceStats.opponents[2] || 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.darkAccent} />
                    <XAxis dataKey="name" tick={{ fill: colors.light }} />
                    <YAxis tick={{ fill: colors.light }} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: colors.dark,
                        borderColor: colors.primary,
                        color: "#fff"
                      }}
                      formatter={(value) => [`${value}%`, '']}
                    />
                    <Legend wrapperStyle={{ color: colors.light }} />
                    <Bar dataKey="yours" name="Your Choices" fill={colors.primary} />
                    <Bar dataKey="opponents" name="Opponents' Choices" fill={colors.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="stats-insights">
              <h3 className="stats-section-title">Performance Insights ({statsFilter === 'avax' ? 'AVAX' : 'GOAT'})</h3>
              <div className="insight-cards">
                <div className="insight-card">
                  <div className="insight-icon">💡</div>
                  <div className="insight-content">
                    <h4>Winning Strategy</h4>
                    <p>
                      {choiceStats.opponents[1] > choiceStats.opponents[0] && choiceStats.opponents[1] > choiceStats.opponents[2] ? 
                      "Opponents tend to choose Paper more often. Try using Scissors to increase your win rate." :
                      choiceStats.opponents[2] > choiceStats.opponents[0] && choiceStats.opponents[2] > choiceStats.opponents[1] ?
                      "Opponents prefer Scissors. Rock would be a good counter-strategy." :
                      choiceStats.opponents[0] > choiceStats.opponents[1] && choiceStats.opponents[0] > choiceStats.opponents[2] ?
                      "Opponents favor Rock. Paper would give you an advantage." :
                      "Your opponents have no clear preference. Mix up your strategy to stay unpredictable."}
                    </p>
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-icon">📊</div>
                  <div className="insight-content">
                    <h4>Performance Summary</h4>
                    <p>With a {winRate}% win rate in {statsFilter === 'avax' ? 'AVAX games' : 'GOAT games'}, you're performing {parseFloat(winRate) > 50 ? 'above' : 'below'} average.</p>
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-icon">💰</div>
                  <div className="insight-content">
                    <h4>Betting Strategy</h4>
                    <p>
                      {filteredStats.played > 0 ? (
                        `Your average bet in ${statsFilter === 'avax' ? 'AVAX' : 'GOAT'} is: ${
                          statsFilter === 'avax' ?
                            formatAvaxAmount(filteredStats.totalBet.div(filteredStats.played)) + ' AVAX' :
                            formatTokenAmount(filteredStats.totalBet.div(filteredStats.played)) + ' GOAT'
                        }.
                        ${filteredStats.totalWinnings.gt(filteredStats.totalBet) ? 
                          " Your strategy is profitable!" : 
                          " Consider adjusting your strategy to improve profits."}`
                      ) : (
                        `Play more ${statsFilter === 'avax' ? 'AVAX' : 'GOAT'} games to see betting insights.`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlayerStats = () => (
    <div className="stats-section">
      <div className="section-header">
        <h2>Your Statistics</h2>
      </div>
      
      {playerStats ? (
        renderEnhancedPlayerStats()
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

  // Main Render
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
              <>
                <div className="balance-display">
                  <div className="balance-item">
                    <span className="balance-label">GOAT</span>
                    <span className="balance-value">{parseFloat(tokenBalance).toFixed(0)}</span>
                  </div>
                  <div className="balance-divider"></div>
                  <div className="balance-item">
                    <span className="balance-label">AVAX</span>
                    <span className="balance-value">{parseFloat(avaxBalance).toFixed(4)}</span>
                  </div>
                </div>
                <div className="account-info">
                  <span>Account: {formatAddress(account)}</span>
                  {isMetaMask() && (
                    <span style={{ 
                      fontSize: '0.8em', 
                      color: '#F7931E',
                      marginLeft: '-15px'
                    }}>
                    
                    </span>
                  )}
                  {!networkCorrect && (
                    <span className="network-warning-badge">Wrong Network</span>
                  )}
                  <button 
                    className="disconnect-wallet-btn"
                    onClick={() => {
                      setAccount(null);
                      setSigner(null);
                      setProvider(null);
                      setContract(null);
                      setTokenContract(null);
                      setPlayerStats(null);
                      setCurrentView('games');
                      setNetworkCorrect(false);
                      loadPublicData(true);
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </>
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
              {['games', 'create', 'stats'].map((view) => (
                <button 
                  key={view}
                  className={`nav-btn ${currentView === view ? 'active' : ''}`}
                  onClick={() => setCurrentView(view)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (view === 'create' || view === 'stats') {
                      if (account) setCurrentView(view);
                    } else {
                      setCurrentView(view);
                    }
                  }}
                  disabled={!account && (view === 'create' || view === 'stats')}
                  style={{ touchAction: 'manipulation' }}
                >
                  {view === 'games' && 'Active Games'}
                  {view === 'create' && 'Create Game'}
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
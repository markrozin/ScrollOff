import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useWalletClient,
} from 'wagmi';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const CHALLENGE_ADDRESS = '0xC5E28A77eA98AD9ECB2737f4Cf0282c60bfDf3Dd';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_DECIMALS = 6;
const toBigInt = window.BigInt;

const challengeAbi = [
  {
    type: 'function',
    name: 'nextChallengeId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'createChallenge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_entryFee', type: 'uint256' },
      { name: '_dailyPenalty', type: 'uint256' },
      { name: '_durationDays', type: 'uint256' },
      { name: '_maxParticipants', type: 'uint256' },
    ],
    outputs: [{ name: 'challengeId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinChallenge',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'startChallenge',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimPrize',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimRefund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getParticipants',
    stateMutability: 'view',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getParticipantCount',
    stateMutability: 'view',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getTotalDeposit',
    stateMutability: 'view',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getPlayerStatus',
    stateMutability: 'view',
    inputs: [
      { name: 'challengeId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'remaining', type: 'uint256' },
      { name: 'penalized', type: 'uint256' },
      { name: 'refunded', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'prizePot',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'challenges',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'entryFee', type: 'uint256' },
      { name: 'dailyPenalty', type: 'uint256' },
      { name: 'maxParticipants', type: 'uint256' },
      { name: 'durationDays', type: 'uint256' },
      { name: 'startTimestamp', type: 'uint256' },
      { name: 'started', type: 'bool' },
      { name: 'settled', type: 'bool' },
      { name: 'winner', type: 'address' },
      { name: 'currentDay', type: 'uint256' },
    ],
  },
];

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

function parseUsdc(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return 0n;
  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = wholePart ? toBigInt(wholePart) : 0n;
  const fraction = (fractionPart + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  const fractionalValue = fraction ? toBigInt(fraction) : 0n;
  return whole * 10n ** toBigInt(USDC_DECIMALS) + fractionalValue;
}

function formatUsdc(value) {
  if (value === null || value === undefined) return '--';
  const amount = typeof value === 'bigint' ? value : toBigInt(value);
  const negative = amount < 0n;
  const normalized = negative ? -amount : amount;
  const divisor = 10n ** toBigInt(USDC_DECIMALS);
  const whole = normalized / divisor;
  const fraction = normalized % divisor;
  const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${fractionStr ? `.${fractionStr}` : ''}`;
}

function shortenAddress(value) {
  if (!value) return '--';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function App() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const [buyAmount, setBuyAmount] = useState('16');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [gameData, setGameData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState('');

  const [createForm, setCreateForm] = useState({
    entryFee: '10',
    dailyPenalty: '2',
    durationDays: '7',
    maxParticipants: '4',
  });

  const addLog = useCallback((msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const refreshGameData = useCallback(async () => {
    if (!publicClient) return;

    setIsRefreshing(true);

    try {
      const nextChallengeId = await publicClient.readContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'nextChallengeId',
      });

      let challengeIdToLoad = selectedChallengeId.trim();
      if (!challengeIdToLoad && nextChallengeId > 0n) {
        challengeIdToLoad = (nextChallengeId - 1n).toString();
        setSelectedChallengeId(challengeIdToLoad);
      }

      let challenge = null;

      if (challengeIdToLoad !== '') {
        const challengeId = toBigInt(challengeIdToLoad);
        const [rawChallenge, participants, participantCount, totalDeposit, prizePot] =
          await Promise.all([
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'challenges',
              args: [challengeId],
            }),
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'getParticipants',
              args: [challengeId],
            }),
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'getParticipantCount',
              args: [challengeId],
            }),
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'getTotalDeposit',
              args: [challengeId],
            }),
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'prizePot',
              args: [challengeId],
            }),
          ]);

        let playerStatus = null;
        let usdcBalance = null;
        let allowance = null;

        if (address) {
          [playerStatus, usdcBalance, allowance] = await Promise.all([
            publicClient.readContract({
              address: CHALLENGE_ADDRESS,
              abi: challengeAbi,
              functionName: 'getPlayerStatus',
              args: [challengeId, address],
            }),
            publicClient.readContract({
              address: USDC_ADDRESS,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            }),
            publicClient.readContract({
              address: USDC_ADDRESS,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address, CHALLENGE_ADDRESS],
            }),
          ]);
        }

        challenge = {
          id: challengeId,
          creator: rawChallenge[0],
          entryFee: rawChallenge[1],
          dailyPenalty: rawChallenge[2],
          maxParticipants: rawChallenge[3],
          durationDays: rawChallenge[4],
          startTimestamp: rawChallenge[5],
          started: rawChallenge[6],
          settled: rawChallenge[7],
          winner: rawChallenge[8],
          currentDay: rawChallenge[9],
          participants,
          participantCount,
          totalDeposit,
          prizePot,
          playerStatus: playerStatus
            ? {
                remaining: playerStatus[0],
                penalized: playerStatus[1],
                refunded: playerStatus[2],
              }
            : null,
          usdcBalance,
          allowance,
        };
      } else if (address) {
        const usdcBalance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        });

        challenge = {
          usdcBalance,
        };
      }

      setGameData({
        nextChallengeId,
        latestChallengeId: nextChallengeId > 0n ? nextChallengeId - 1n : null,
        challenge,
      });
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      addLog(`ERROR: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [addLog, address, publicClient, selectedChallengeId]);

  useEffect(() => {
    refreshGameData();
  }, [refreshGameData]);

  const runTransaction = useCallback(
    async (label, callback) => {
      if (!walletClient || !publicClient || !address) {
        setStatus('Connect a wallet first');
        return;
      }

      setPendingAction(label);
      setStatus(label);
      addLog(label);

      try {
        const hash = await callback();
        addLog(`Tx submitted: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setStatus(`${label} confirmed`);
        addLog(`Confirmed in block ${receipt.blockNumber.toString()}`);
        await refreshGameData();
        return receipt;
      } catch (error) {
        setStatus(`Error: ${error.shortMessage || error.message}`);
        addLog(`ERROR: ${error.shortMessage || error.message}`);
        throw error;
      } finally {
        setPendingAction('');
      }
    },
    [addLog, address, publicClient, refreshGameData, walletClient]
  );

  const openOnramp = useCallback(async () => {
    if (!address) {
      setStatus('Connect a wallet first');
      return;
    }

    const fiatAmount = Number(buyAmount);
    if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      setStatus('Enter a valid USD amount');
      return;
    }

    addLog(`Creating Coinbase session token for ${address}`);

    let sessionToken;

    try {
      const response = await fetch(`${API_BASE_URL}/onramp/session-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          asset: 'USDC',
          network: 'base',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.sessionToken) {
        throw new Error(data?.error || 'Failed to create Coinbase session token');
      }

      sessionToken = data.sessionToken;
      addLog('Session token created');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      addLog(`ERROR: ${error.message}`);
      return;
    }

    const url = new URL('https://pay.coinbase.com/buy/select-asset');
    url.searchParams.set('sessionToken', sessionToken);
    url.searchParams.set('defaultAsset', 'USDC');
    url.searchParams.set('defaultNetwork', 'base');
    url.searchParams.set('presetFiatAmount', String(fiatAmount));
    url.searchParams.set('fiatCurrency', 'USD');
    url.searchParams.set('defaultExperience', 'buy');

    addLog(`Opening Coinbase Onramp for $${buyAmount} → USDC on Base`);

    const popup = window.open(
      url.toString(),
      'coinbase-onramp',
      'popup=yes,width=480,height=760'
    );

    if (!popup) {
      setStatus('Popup blocked. Please allow popups and try again.');
      addLog('ERROR: Popup blocked');
      return;
    }

    const closeWatcher = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(closeWatcher);
        setStatus('Onramp window closed');
        addLog('Onramp closed');
        refreshGameData();
      }
    }, 500);
  }, [addLog, address, buyAmount, refreshGameData]);

  const handleCreateChallenge = useCallback(async () => {
    const nextChallengeId = gameData?.nextChallengeId ?? 0n;
    const entryFee = parseUsdc(createForm.entryFee);
    const dailyPenalty = parseUsdc(createForm.dailyPenalty);
    const durationDays = toBigInt(parseInteger(createForm.durationDays));
    const maxParticipants = toBigInt(parseInteger(createForm.maxParticipants));

    await runTransaction('Creating challenge', async () => {
      const hash = await walletClient.writeContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'createChallenge',
        args: [entryFee, dailyPenalty, durationDays, maxParticipants],
        chain: walletClient.chain,
        account: walletClient.account,
      });
      setSelectedChallengeId(nextChallengeId.toString());
      return hash;
    });
  }, [createForm, gameData?.nextChallengeId, runTransaction, walletClient]);

  const handleApprove = useCallback(async () => {
    const totalDeposit = gameData?.challenge?.totalDeposit;
    if (totalDeposit === null || totalDeposit === undefined) return;

    await runTransaction(`Approving ${formatUsdc(totalDeposit)} USDC`, async () =>
      walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CHALLENGE_ADDRESS, totalDeposit],
        chain: walletClient.chain,
        account: walletClient.account,
      })
    );
  }, [gameData?.challenge?.totalDeposit, runTransaction, walletClient]);

  const handleJoin = useCallback(async () => {
    const challengeId = gameData?.challenge?.id;
    if (challengeId === null || challengeId === undefined) return;

    await runTransaction(`Joining challenge #${challengeId.toString()}`, async () =>
      walletClient.writeContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'joinChallenge',
        args: [challengeId],
        chain: walletClient.chain,
        account: walletClient.account,
      })
    );
  }, [gameData?.challenge?.id, runTransaction, walletClient]);

  const handleStart = useCallback(async () => {
    const challengeId = gameData?.challenge?.id;
    if (challengeId === null || challengeId === undefined) return;

    await runTransaction(`Starting challenge #${challengeId.toString()}`, async () =>
      walletClient.writeContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'startChallenge',
        args: [challengeId],
        chain: walletClient.chain,
        account: walletClient.account,
      })
    );
  }, [gameData?.challenge?.id, runTransaction, walletClient]);

  const handleClaimPrize = useCallback(async () => {
    const challengeId = gameData?.challenge?.id;
    if (challengeId === null || challengeId === undefined) return;

    await runTransaction(`Claiming prize for #${challengeId.toString()}`, async () =>
      walletClient.writeContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'claimPrize',
        args: [challengeId],
        chain: walletClient.chain,
        account: walletClient.account,
      })
    );
  }, [gameData?.challenge?.id, runTransaction, walletClient]);

  const handleClaimRefund = useCallback(async () => {
    const challengeId = gameData?.challenge?.id;
    if (challengeId === null || challengeId === undefined) return;

    await runTransaction(`Claiming refund for #${challengeId.toString()}`, async () =>
      walletClient.writeContract({
        address: CHALLENGE_ADDRESS,
        abi: challengeAbi,
        functionName: 'claimRefund',
        args: [challengeId],
        chain: walletClient.chain,
        account: walletClient.account,
      })
    );
  }, [gameData?.challenge?.id, runTransaction, walletClient]);

  const currentChallenge = gameData?.challenge ?? null;
  const participantSet = useMemo(
    () => new Set(currentChallenge?.participants?.map((value) => value.toLowerCase()) || []),
    [currentChallenge?.participants]
  );
  const isParticipant = address ? participantSet.has(address.toLowerCase()) : false;
  const isCreator =
    address && currentChallenge?.creator
      ? currentChallenge.creator.toLowerCase() === address.toLowerCase()
      : false;
  const canApprove =
    isConnected &&
    currentChallenge?.totalDeposit !== undefined &&
    currentChallenge?.allowance !== undefined &&
    currentChallenge.allowance < currentChallenge.totalDeposit;
  const canJoin =
    isConnected &&
    currentChallenge?.id !== undefined &&
    !currentChallenge.started &&
    !currentChallenge.settled &&
    !isParticipant;
  const canStart =
    isConnected &&
    currentChallenge?.id !== undefined &&
    !currentChallenge.started &&
    !currentChallenge.settled &&
    isCreator &&
    Number(currentChallenge.participantCount || 0n) >= 2;
  const canClaimPrize =
    isConnected &&
    currentChallenge?.settled &&
    currentChallenge?.winner &&
    address &&
    currentChallenge.winner.toLowerCase() === address.toLowerCase() &&
    currentChallenge.prizePot > 0n;
  const canClaimRefund =
    isConnected &&
    currentChallenge?.settled &&
    currentChallenge?.playerStatus &&
    currentChallenge.playerStatus.remaining > 0n &&
    !currentChallenge.playerStatus.refunded;

  const cbWalletConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK');
  const metamaskConnector = connectors.find((c) => c.id === 'io.metamask');

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>SCROLLOFF GAME CONSOLE</h1>
      <p style={styles.subtitle}>Fund wallet, spin up a challenge, join with stakes, and manage the onchain game flow.</p>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Contracts</h2>
        <div style={styles.info}>
          <span style={styles.label}>Challenge Contract:</span>
          <code style={styles.code}>{CHALLENGE_ADDRESS}</code>
        </div>
        <div style={styles.info}>
          <span style={styles.label}>USDC:</span>
          <code style={styles.code}>{USDC_ADDRESS}</code>
        </div>
        <div style={styles.info}>
          <span style={styles.label}>Latest Challenge:</span>
          <code style={styles.code}>
            {gameData?.latestChallengeId !== null && gameData?.latestChallengeId !== undefined
              ? gameData.latestChallengeId.toString()
              : 'None yet'}
          </code>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Connect Wallet</h2>
        {isConnected ? (
          <div>
            <div style={styles.connected}>
              <span style={styles.dot}>●</span>
              Connected via {connector?.name}
            </div>
            <code style={styles.code}>{address}</code>
            <div style={styles.statRow}>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Wallet USDC</div>
                <div style={styles.cardValue}>{formatUsdc(currentChallenge?.usdcBalance)} USDC</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Allowance To Game</div>
                <div style={styles.cardValue}>{formatUsdc(currentChallenge?.allowance)} USDC</div>
              </div>
            </div>
            <button style={styles.buttonOutline} onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <div style={styles.buttonRow}>
            {cbWalletConnector && (
              <button style={styles.button} onClick={() => connect({ connector: cbWalletConnector })}>
                Coinbase Smart Wallet
              </button>
            )}
            {metamaskConnector && (
              <button
                style={styles.buttonOutline}
                onClick={() => connect({ connector: metamaskConnector })}
              >
                MetaMask
              </button>
            )}
          </div>
        )}
        {connectError ? <div style={styles.errorText}>{connectError.message}</div> : null}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Fund Wallet</h2>
        <p style={styles.dim}>
          Buy Base USDC straight into the connected wallet so it can cover challenge entry and penalty deposits.
        </p>
        <div style={styles.row}>
          <span style={styles.label}>$</span>
          <input
            style={{ ...styles.input, width: '100px' }}
            type="number"
            min="1"
            step="0.01"
            value={buyAmount}
            onChange={(event) => setBuyAmount(event.target.value)}
          />
          <span style={styles.label}>USD → USDC</span>
        </div>
        <button
          style={isConnected ? styles.button : styles.buttonDisabled}
          onClick={openOnramp}
          disabled={!isConnected}
        >
          {isConnected ? `Buy $${buyAmount} USDC` : 'Connect wallet first'}
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Create A Challenge</h2>
        <p style={styles.dim}>
          This writes a new game onchain. Entry fee goes directly to the pot; each player also escrows penalty funds up front.
        </p>
        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Entry Fee (USDC)</span>
            <input
              style={styles.input}
              value={createForm.entryFee}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, entryFee: event.target.value }))
              }
            />
          </label>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Daily Penalty (USDC)</span>
            <input
              style={styles.input}
              value={createForm.dailyPenalty}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, dailyPenalty: event.target.value }))
              }
            />
          </label>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Duration (days)</span>
            <input
              style={styles.input}
              value={createForm.durationDays}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, durationDays: event.target.value }))
              }
            />
          </label>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Max Players</span>
            <input
              style={styles.input}
              value={createForm.maxParticipants}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, maxParticipants: event.target.value }))
              }
            />
          </label>
        </div>
        <button
          style={isConnected ? styles.button : styles.buttonDisabled}
          onClick={handleCreateChallenge}
          disabled={!isConnected || pendingAction !== ''}
        >
          Create Challenge
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Select Challenge</h2>
        <div style={styles.row}>
          <label style={{ ...styles.field, maxWidth: '180px' }}>
            <span style={styles.fieldLabel}>Challenge ID</span>
            <input
              style={styles.input}
              value={selectedChallengeId}
              onChange={(event) => setSelectedChallengeId(event.target.value)}
              placeholder="0"
            />
          </label>
          <button style={styles.buttonOutline} onClick={refreshGameData} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Load Challenge'}
          </button>
          {gameData?.latestChallengeId !== null && gameData?.latestChallengeId !== undefined ? (
            <button
              style={styles.buttonOutline}
              onClick={() => setSelectedChallengeId(gameData.latestChallengeId.toString())}
            >
              Jump To Latest
            </button>
          ) : null}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Game Dashboard</h2>
        {currentChallenge?.id !== undefined ? (
          <>
            <div style={styles.statRow}>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Challenge</div>
                <div style={styles.cardValue}>#{currentChallenge.id.toString()}</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Pot</div>
                <div style={styles.cardValue}>{formatUsdc(currentChallenge.prizePot)} USDC</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Required Deposit</div>
                <div style={styles.cardValue}>{formatUsdc(currentChallenge.totalDeposit)} USDC</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardLabel}>Day</div>
                <div style={styles.cardValue}>
                  {currentChallenge.currentDay.toString()} / {currentChallenge.durationDays.toString()}
                </div>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoBlock}>
                <div style={styles.infoTitle}>Challenge Setup</div>
                <div style={styles.infoLine}>Creator: {shortenAddress(currentChallenge.creator)}</div>
                <div style={styles.infoLine}>Entry Fee: {formatUsdc(currentChallenge.entryFee)} USDC</div>
                <div style={styles.infoLine}>
                  Daily Penalty: {formatUsdc(currentChallenge.dailyPenalty)} USDC
                </div>
                <div style={styles.infoLine}>
                  Players: {currentChallenge.participantCount.toString()} /{' '}
                  {currentChallenge.maxParticipants.toString()}
                </div>
                <div style={styles.infoLine}>
                  Status: {currentChallenge.settled ? 'Settled' : currentChallenge.started ? 'Active' : 'Open'}
                </div>
              </div>

              <div style={styles.infoBlock}>
                <div style={styles.infoTitle}>Your Position</div>
                <div style={styles.infoLine}>Connected: {address ? shortenAddress(address) : '--'}</div>
                <div style={styles.infoLine}>Creator: {isCreator ? 'Yes' : 'No'}</div>
                <div style={styles.infoLine}>Participant: {isParticipant ? 'Yes' : 'No'}</div>
                <div style={styles.infoLine}>
                  Remaining Deposit: {formatUsdc(currentChallenge.playerStatus?.remaining)} USDC
                </div>
                <div style={styles.infoLine}>
                  Penalties Charged: {formatUsdc(currentChallenge.playerStatus?.penalized)} USDC
                </div>
                <div style={styles.infoLine}>
                  Refund Claimed: {currentChallenge.playerStatus?.refunded ? 'Yes' : 'No'}
                </div>
              </div>

              <div style={styles.infoBlock}>
                <div style={styles.infoTitle}>Participants</div>
                {currentChallenge.participants.length === 0 ? (
                  <div style={styles.infoLine}>No one has joined yet.</div>
                ) : (
                  currentChallenge.participants.map((participant) => (
                    <div key={participant} style={styles.infoLine}>
                      {shortenAddress(participant)}
                    </div>
                  ))
                )}
                {currentChallenge.winner && currentChallenge.winner !== '0x0000000000000000000000000000000000000000' ? (
                  <div style={{ ...styles.infoLine, marginTop: '8px', color: '#4ade80' }}>
                    Winner: {shortenAddress(currentChallenge.winner)}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={styles.buttonRowWrap}>
              <button
                style={canApprove ? styles.button : styles.buttonDisabled}
                onClick={handleApprove}
                disabled={!canApprove || pendingAction !== ''}
              >
                Approve Deposit
              </button>
              <button
                style={canJoin ? styles.button : styles.buttonDisabled}
                onClick={handleJoin}
                disabled={!canJoin || pendingAction !== ''}
              >
                Join Challenge
              </button>
              <button
                style={canStart ? styles.button : styles.buttonDisabled}
                onClick={handleStart}
                disabled={!canStart || pendingAction !== ''}
              >
                Start Challenge
              </button>
              <button
                style={canClaimPrize ? styles.button : styles.buttonDisabled}
                onClick={handleClaimPrize}
                disabled={!canClaimPrize || pendingAction !== ''}
              >
                Claim Prize
              </button>
              <button
                style={canClaimRefund ? styles.button : styles.buttonDisabled}
                onClick={handleClaimRefund}
                disabled={!canClaimRefund || pendingAction !== ''}
              >
                Claim Refund
              </button>
            </div>

            <div style={styles.tipBox}>
              Backend referee flow: once the challenge is started, your backend cron still needs to report daily overages and settle the winner. This screen now covers the player-side onchain actions before and after that referee step.
            </div>
          </>
        ) : (
          <div style={styles.tipBox}>
            Create a challenge or enter an existing challenge ID to load the live game state.
          </div>
        )}
      </div>

      {status ? <div style={styles.status}>{status}</div> : null}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Log</h2>
        <div style={styles.logBox}>
          {logs.length === 0 ? (
            <span style={styles.dim}>No activity yet</span>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={styles.logLine}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '"Courier New", Courier, monospace',
    background: '#111',
    color: '#e0e0e0',
    minHeight: '100vh',
    padding: '40px',
    maxWidth: '980px',
    margin: '0 auto',
  },
  title: {
    fontSize: '34px',
    letterSpacing: '4px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '40px',
    maxWidth: '720px',
  },
  section: {
    marginBottom: '32px',
    borderTop: '1px solid #333',
    paddingTop: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    letterSpacing: '2px',
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  info: {
    marginBottom: '8px',
  },
  label: {
    color: '#888',
    marginRight: '8px',
  },
  code: {
    background: '#222',
    padding: '2px 6px',
    fontSize: '12px',
    wordBreak: 'break-all',
    display: 'inline-block',
    marginBottom: '8px',
  },
  input: {
    background: '#222',
    border: '1px solid #444',
    color: '#e0e0e0',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  row: {
    display: 'flex',
    alignItems: 'end',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '12px',
    color: '#888',
    letterSpacing: '1px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  buttonRowWrap: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '20px',
  },
  button: {
    background: '#e0e0e0',
    color: '#111',
    border: 'none',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    padding: '12px 24px',
    cursor: 'pointer',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  buttonOutline: {
    background: 'transparent',
    color: '#e0e0e0',
    border: '1px solid #e0e0e0',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    padding: '12px 24px',
    cursor: 'pointer',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    background: '#333',
    color: '#666',
    border: 'none',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    padding: '12px 24px',
    cursor: 'not-allowed',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  connected: {
    color: '#4ade80',
    marginBottom: '8px',
    fontSize: '14px',
  },
  dot: {
    marginRight: '6px',
  },
  status: {
    background: '#1a2a1a',
    border: '1px solid #2a4a2a',
    padding: '12px',
    marginBottom: '24px',
    fontSize: '13px',
  },
  statRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  card: {
    border: '1px solid #333',
    background: '#161616',
    padding: '14px',
  },
  cardLabel: {
    fontSize: '12px',
    color: '#777',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  cardValue: {
    fontSize: '20px',
    color: '#f5f5f5',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  infoBlock: {
    border: '1px solid #333',
    background: '#0f0f0f',
    padding: '14px',
  },
  infoTitle: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  infoLine: {
    fontSize: '13px',
    marginBottom: '6px',
    wordBreak: 'break-word',
  },
  tipBox: {
    marginTop: '16px',
    padding: '12px',
    border: '1px solid #333',
    background: '#171717',
    color: '#b5b5b5',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  errorText: {
    color: '#ff7b7b',
    marginTop: '10px',
    fontSize: '13px',
  },
  logBox: {
    background: '#0a0a0a',
    border: '1px solid #333',
    padding: '12px',
    minHeight: '120px',
    maxHeight: '260px',
    overflowY: 'auto',
    fontSize: '12px',
  },
  logLine: {
    marginBottom: '4px',
  },
  dim: {
    color: '#555',
    fontSize: '13px',
    marginBottom: '12px',
    display: 'block',
    lineHeight: 1.5,
  },
};

export default App;

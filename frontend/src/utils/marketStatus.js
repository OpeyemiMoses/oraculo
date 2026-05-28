export function getMarketTiming(market) {
  if (!market?.resolveBy) {
    return { hasTimer: false, hoursLeft: null, expired: false };
  }

  const msLeft = Number(market.resolveBy) * 1000 - Date.now();
  const hoursLeft = Math.max(0, Math.floor(msLeft / 1000 / 3600));

  return {
    hasTimer: true,
    hoursLeft,
    expired: msLeft <= 0,
  };
}

export function getMarketPool(market) {
  return (parseFloat(market?.poolWith || 0) || 0) + (parseFloat(market?.poolAgainst || 0) || 0);
}

export function getMarketDisplay(market) {
  const pool = getMarketPool(market);
  const timing = getMarketTiming(market);
  const isOpen = market?.status === "Open";
  const isResolved = market?.status === "Resolved";
  const isCancelled = market?.status === "Cancelled";
  const isExpiredOpen = isOpen && timing.expired;
  const isClosed = !isOpen || isExpiredOpen;
  const isEmptyExpired = isExpiredOpen && pool <= 0;
  const isRunningClosed = isExpiredOpen && pool > 0;

  // Pool shape detection
  const poolWith = parseFloat(market?.poolWith || 0);
  const poolAgainst = parseFloat(market?.poolAgainst || 0);
  const hasOnlyWithBets = pool > 0 && poolAgainst === 0;
  const hasOnlyAgainstBets = pool > 0 && poolWith === 0;
  const isOneSided = hasOnlyWithBets || hasOnlyAgainstBets;

  // Solo bettor: one side has bets, the other is empty, and market is still open for betting
  // We can't detect exactly 1 person on-chain from the frontend, but one-sided pool
  // at expiry is treated as the refund/disclaimer scenario
  const isSoloBetExpired = isExpiredOpen && isOneSided;

  // Timer label
  let timerLabel = "";
  if (isResolved || isCancelled) {
    timerLabel = "Closed";
  } else if (isRunningClosed && !isOneSided) {
    timerLabel = "Currently running";
  } else if (isSoloBetExpired) {
    timerLabel = "Closed";
  } else if (isEmptyExpired) {
    timerLabel = "Closed";
  } else if (timing.hasTimer) {
    timerLabel = `Closes in ${timing.hoursLeft}h`;
  }

  // Status label and class for the tag badge
  const statusLabel = (isClosed || isResolved || isCancelled) ? "Closed" : "Open";
  const statusClass = (isClosed || isResolved || isCancelled) ? "tag-cancelled" : "tag-open";

  return {
    pool,
    poolWith,
    poolAgainst,
    hoursLeft: timing.hoursLeft,
    isOpen,
    isResolved,
    isCancelled,
    isClosed,
    isEmptyExpired,
    isRunningClosed,
    isOneSided,
    isSoloBetExpired,
    hasOnlyWithBets,
    hasOnlyAgainstBets,
    isLiveListItem: isOpen && !isEmptyExpired,
    isActiveBettable: isOpen && !isExpiredOpen,
    statusLabel,
    statusClass,
    timerLabel,
  };
}
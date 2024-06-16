const defaultVals = {
  'refresh_time': 10000,
  'decimal_separator': false,
  'green_badge_color': '#7ED321',
  'red_badge_color': '#A9A9A9',
  'currency': 'USD'
};

let config = {};
let alertCounter = 0;
let lastAlertTime = 0;
let lastApiCallTime = 0;

const fetchCryptoPrices = async () => {
  const currencies = ['ETH', 'BTC', 'DOGE', 'SOL'];
  console.log("Starting to fetch crypto prices at", new Date().toISOString());
  for (let i = 0; i < currencies.length; i++) {
    const currency = currencies[i];
    await new Promise(resolve => setTimeout(resolve, Math.max(1000 - (Date.now() - lastApiCallTime), 0)));
    console.log(`Fetching price for ${currency} at ${new Date().toISOString()}`);
    fetchPriceForCurrency(currency).then(result => {
      console.log(`Price for ${currency}: `, result);
      if (result.error) {
        console.error(`Error fetching prices for ${currency}:`, result.error);
      } else {
        checkThresholdsAndNotify(result.price, currency);
      }
      lastApiCallTime = Date.now();
    });
  }
};

const currencyPairs = {
  'ETH': 'XETHZUSD',
  'BTC': 'XXBTZUSD',
  'DOGE': 'XDGUSD',
  'SOL': 'SOLUSD',
};

const fetchPriceForCurrency = async (currency) => {
  try {
    const pair = currencyPairs[currency] || `X${currency}ZUSD`;
    console.log(`Attempting to fetch data for pair: ${pair}`);
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log(`Response from Kraken for ${pair}:`, data);

    // Check if the HTTP response status code is not 200 OK
    if (response.status !== 200) {
      console.error(`Non-200 status code received: ${response.status}`);
      // Handle non-200 responses accordingly
    }

    // Log the pair and check if the result object contains the pair
    console.log(`Checking if data.result contains the pair: `, data.result.hasOwnProperty(pair));

    if (!data.result || !data.result[pair]) {
      throw new Error(`No data for pair: ${pair}`);
    }

    const res = data.result[pair];
    return { price: parseFloat(res.c[0]), opening: parseFloat(res.o) };
  } catch (error) {
    console.error(`Error fetching prices for ${currency}:`, error);
    return { error };
  }
};


const updateBadge = () => {
  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  chrome.action.setBadgeText({ text: alertCounter.toString() });
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ config: defaultVals }, () => {
    config = { ...defaultVals };
    fetchCryptoPrices();
    chrome.alarms.create('refresh', { periodInMinutes: config.refresh_time / 60000 });
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') {
    fetchCryptoPrices();
  }
});

const notifyUser = (title, message) => {
  const currentTime = new Date().getTime();
  const timeSinceLastAlert = currentTime - lastAlertTime;
  if (alertCounter > 3 && timeSinceLastAlert < 1800000) {
    console.log('Alert skipped to avoid flooding. Waiting for the 30-minute interval.');
    return;
  }
  chrome.notifications.create({
    title: title,
    message: message,
    iconUrl: chrome.runtime.getURL("icons/icon@48.png"),
    type: "basic",
    silent: false
  }, function(notificationId) {
    alertCounter++;
    lastAlertTime = currentTime;
    updateBadge();  // Update badge whenever a new alert is fired
  });
};

const checkThresholdsAndNotify = (currentPrice, currency) => {
  chrome.storage.local.get([`${currency.toLowerCase()}_high_notification`, `${currency.toLowerCase()}_low_notification`], function(result) {
    const highThreshold = parseFloat(result[`${currency.toLowerCase()}_high_notification`]);
    const lowThreshold = parseFloat(result[`${currency.toLowerCase()}_low_notification`]);
    if (currentPrice >= highThreshold || currentPrice <= lowThreshold) {
      const direction = currentPrice >= highThreshold ? 'above' : 'below';
      notifyUser(`${currency} Price Alert`, `Price is ${direction} your threshold! Current price: ${currentPrice}`);
    }
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "resetAlertCounter") {
    alertCounter = 0; // Reset the alert counter
    chrome.action.setBadgeText({ text: '' }); // Clear badge text
  }
});

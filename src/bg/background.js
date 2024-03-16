const defaultVals = {
  'refresh_time': 10000,
  'decimal_separator': false,
  'green_badge_color': '#7ED321',
  'red_badge_color': '#A9A9A9',
  'currency': 'USD'
};

let config = {};
let alertCounter = 0; // Initialize alert counter
let lastAlertTime = 0; // Initialize last alert timestamp


const fetchCryptoPrices = async () => {
  try {
    const url = `https://api.kraken.com/0/public/Ticker?pair=ETH${config.currency}`;
    const response = await fetch(url);
    const data = await response.json();
    const res = data.result[`XETHZ${config.currency}`];

    checkThresholdsAndNotify(parseFloat(res.c[0]));

    console.log('Fetched price:', parseFloat(res.c[0]));
    updateBadge(parseFloat(res.c[0]), parseFloat(res.o));

  } catch (error) {
    console.error('Error fetching crypto prices:', error);
  }
};


const updateBadge = (price, opening) => {
  console.log('Updating badge with price:', price); // Debugging: Log the price being set
  const color = price > opening ? config.green_badge_color : config.red_badge_color;
  chrome.action.setBadgeBackgroundColor({ color });

  // Convert the price to a string with toFixed to control the number of decimals
  let text = price.toFixed(2);

  // Remove the decimal point without using replace(), assuming we always have two decimal places
  text = text.substring(0, text.length - 3) + text.substring(text.length - 2);

  text = text.length > 4 ? text.substring(0, 4) : text; // Ensure text is not longer than 4 characters
  console.log('Badge text set to:', text); // Debugging: Log the text being set

  chrome.action.setBadgeText({ text });
};


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "resetAlertCounter") {
    alertCounter = 0; // Reset the alert counter
    console.log('Alert counter reset.');
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ config: defaultVals }, () => {
    config = { ...defaultVals };
    fetchCryptoPrices();
    chrome.alarms.create({ periodInMinutes: config.refresh_time / 60000 });
  });
});

chrome.alarms.onAlarm.addListener(fetchCryptoPrices);


const notifyUser = (title, message) => {
  const currentTime = new Date().getTime();
  const timeSinceLastAlert = currentTime - lastAlertTime;

  // If more than 3 alerts have been sent and it's been less than 30 minutes since the last alert, don't send a new alert.
  if (alertCounter > 3 && timeSinceLastAlert < 1800000) {
    console.log('Alert skipped to avoid flooding. Waiting for the 30-minute interval.');
    return;
  }

  console.log('Attempting to send notification:', title, message);
  chrome.notifications.create({
    title: title,
    iconUrl: chrome.runtime.getURL("icons/icon@48.png"),
    message: message,
    type: "basic",
    silent: false
  }, function(notificationId) {
    console.log(`Notification pushed ${notificationId}`);
    alertCounter++; // Increment the alert counter
    lastAlertTime = currentTime; // Update the last alert timestamp
  });
};


const checkThresholdsAndNotify = (currentPrice) => {
  console.log('Checking thresholds for notifications...', currentPrice);
  chrome.storage.local.get(['high_notification', 'low_notification'], function(result) {
    console.log('Thresholds - High:', result.high_notification, 'Low:', result.low_notification);
    const highThreshold = parseFloat(result.high_notification);
    const lowThreshold = parseFloat(result.low_notification);

    if (currentPrice >= highThreshold) {
      console.log('Current price is above the high threshold.');
      notifyUser('ETH Price Alert', `Price is above your high threshold! Current price: ${currentPrice}`);
    } else if (currentPrice <= lowThreshold) {
      console.log('Current price is below the low threshold.');
      notifyUser('ETH Price Alert', `Price is below your low threshold! Current price: ${currentPrice}`);
    }
  });
};

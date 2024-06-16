// Configuration object for currency settings and colors
const config = {
  'ETH': {
    'currency': 'USD',
    'symbol': '$',
    'symbol_prefix': true,
    'green_badge_color': '#7ED321',
    'red_badge_color': '#A9A9A9',
    'pair': 'XETHZUSD'
  },
  'BTC': {
    'currency': 'USD',
    'symbol': '$',
    'symbol_prefix': true,
    'green_badge_color': '#7ED321',
    'red_badge_color': '#A9A9A9',
    'pair': 'XXBTZUSD'
  },
  'DOGE': {
    'currency': 'USD',
    'symbol': '$',
    'symbol_prefix': true,
    'green_badge_color': '#7ED321',
    'red_badge_color': '#A9A9A9',
    'pair': 'XDGUSD'
  },
  'SOL': {
    'currency': 'USD',
    'symbol': '$',
    'symbol_prefix': true,
    'green_badge_color': '#7ED321',
    'red_badge_color': '#A9A9A9',
    'pair': 'SOLUSD'
  }
};

const requestData = () => {
  let lastCallTime = 0;
  Object.keys(config).forEach(async (currency, index) => {
    await new Promise(resolve => setTimeout(resolve, Math.max(1000 * index - (Date.now() - lastCallTime), 0)));
    const pair = config[currency].pair;
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
          const result = data.result[pair];
          updateUIElements({
            price: parseFloat(result.c[0]),
            opening: parseFloat(result.o),
            high: parseFloat(result.h[1]),
            low: parseFloat(result.l[1])
          }, currency);
          lastCallTime = Date.now();
        })
        .catch(error => {
          console.error(`Error fetching crypto prices for ${currency}:`, error);
        });
  });
};



// Function to update the UI elements with the fetched data
const updateUIElements = (priceData, currency) => {
  const container = document.querySelector(`.container.${currency.toLowerCase()}`);
  const priceElement = container.querySelector('.price');
  const openingElement = container.querySelector('.opening');
  const highElement = container.querySelector('.high');
  const lowElement = container.querySelector('.low');
  const percentageElement = container.querySelector('.percentage');
  const iconUpElement = container.querySelector('.icon-up');
  const iconDownElement = container.querySelector('.icon-down');

  priceElement.textContent = formatPrice(priceData.price, currency);
  openingElement.textContent = formatPrice(priceData.opening, currency);
  highElement.textContent = formatPrice(priceData.high, currency);
  lowElement.textContent = formatPrice(priceData.low, currency);

  const percentage = calculatePercentage(priceData.price, priceData.opening);
  percentageElement.textContent = `${percentage}%`;

  iconUpElement.style.visibility = percentage >= 0 ? 'visible' : 'hidden';
  iconDownElement.style.visibility = percentage < 0 ? 'visible' : 'hidden';
  percentageElement.style.color = percentage >= 0 ? config[currency].green_badge_color : config[currency].red_badge_color;
};

// Function to format the price to the desired currency display
const formatPrice = (price, currency) => {
  const symbol = config[currency].symbol;
  return config[currency].symbol_prefix ? `${symbol}${price.toFixed(2)}` : `${price.toFixed(2)}${symbol}`;
};

// Function to calculate the percentage difference between two prices
const calculatePercentage = (currentPrice, openingPrice) => {
  return (((currentPrice - openingPrice) / openingPrice) * 100).toFixed(2);
};

// Load settings from local storage into the form and attach event listeners
document.addEventListener('DOMContentLoaded', function () {
  chrome.runtime.sendMessage("resetAlertCounter");  // Send message to reset alert counter on popup open
  ['ETH', 'BTC', 'DOGE', 'SOL'].forEach(currency => {
    loadSettings(currency);
    const saveButton = document.querySelector(`.${currency.toLowerCase()} .save-button`);
    saveButton.addEventListener('click', () => saveSettings(currency));
  });
  requestData();  // Fetch data on load
});

// Load settings for specified currency
const loadSettings = (currency) => {
  chrome.storage.local.get([`${currency.toLowerCase()}_high_notification`, `${currency.toLowerCase()}_low_notification`], function(result) {
    document.getElementById(`${currency.toLowerCase()}-high-notification`).value = result[`${currency.toLowerCase()}_high_notification`] || '';
    document.getElementById(`${currency.toLowerCase()}-low-notification`).value = result[`${currency.toLowerCase()}_low_notification`] || '';
  });
};

// Save settings for specified currency
const saveSettings = (currency) => {
  const highVal = document.getElementById(`${currency.toLowerCase()}-high-notification`).value;
  const lowVal = document.getElementById(`${currency.toLowerCase()}-low-notification`).value;
  let settings = {};
  settings[`${currency.toLowerCase()}_high_notification`] = highVal;
  settings[`${currency.toLowerCase()}_low_notification`] = lowVal;

  chrome.storage.local.set(settings, function() {
    alert(`${currency} settings saved`);
    requestData();  // Re-fetch prices with potentially new settings
  });
};


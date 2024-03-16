// Global scope configuration object
const config = {
  'currency': 'USD',
  'symbol': '$',
  'symbol_prefix': true,
  'green_badge_color': '#7ED321',
  'red_badge_color': '#A9A9A9',
};

// The requestData function is accessible in the global scope.
const requestData = () => {
  const url = `https://api.kraken.com/0/public/Ticker?pair=ETH${config.currency}`;
  fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const result = data.result[`XETHZ${config.currency}`];
        updateUIElements({
          price: parseFloat(result.c[0]),
          opening: parseFloat(result.o),
          high: parseFloat(result.h[1]),
          low: parseFloat(result.l[1])
        });
      })
      .catch((error) => {
        console.error('Error fetching crypto prices:', error);
      });
};

// Function to update the UI elements with the fetched data
const updateUIElements = (priceData) => {
  const priceElement = document.querySelector('.price');
  const openingElement = document.querySelector('.opening');
  const highElement = document.querySelector('.high');
  const lowElement = document.querySelector('.low');
  const percentageElement = document.querySelector('.percentage');
  const iconUpElement = document.querySelector('.icon-up');
  const iconDownElement = document.querySelector('.icon-down');

  priceElement.textContent = formatPrice(priceData.price);
  openingElement.textContent = formatPrice(priceData.opening);
  highElement.textContent = formatPrice(priceData.high);
  lowElement.textContent = formatPrice(priceData.low);

  const percentage = calculatePercentage(priceData.price, priceData.opening);
  percentageElement.textContent = `${percentage}%`;

  if (percentage >= 0) {
    iconUpElement.style.visibility = 'visible';
    iconDownElement.style.visibility = 'hidden';
    percentageElement.style.color = config.green_badge_color;
  } else {
    iconUpElement.style.visibility = 'hidden';
    iconDownElement.style.visibility = 'visible';
    percentageElement.style.color = config.red_badge_color;
  }
};

// Function to format the price to the desired currency display
const formatPrice = (price) => {
  return config.symbol_prefix ? `${config.symbol}${price.toFixed(2)}` : `${price.toFixed(2)}${config.symbol}`;
};

// Function to calculate the percentage difference between two prices
const calculatePercentage = (currentPrice, openingPrice) => {
  return (((currentPrice - openingPrice) / openingPrice) * 100).toFixed(2);
};

// Initializes the currency switcher on the popup
const initCurrencySwitcher = () => {
  document.querySelectorAll('input[name="currency"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      config.currency = event.target.value;
      requestData(); // Request new data when currency changes
    });
  });
};

// Load settings from local storage into the form
const loadSettings = () => {
  chrome.storage.local.get(['high_notification', 'low_notification'], function(result) {
    if (result.high_notification) {
      document.getElementById('high-notification').value = result.high_notification;
    }
    if (result.low_notification) {
      document.getElementById('low-notification').value = result.low_notification;
    }
  });
};

// Save settings from the form into local storage
const saveSettings = () => {
  const highVal = document.getElementById('high-notification').value;
  const lowVal = document.getElementById('low-notification').value;
  chrome.storage.local.set({
    'high_notification': highVal,
    'low_notification': lowVal
  }, function() {
    // Notify the user that the settings were saved
    alert('Settings saved');
    // Send a message to the background script to reset the alert counter
    chrome.runtime.sendMessage("resetAlertCounter");
    // Re-fetch prices with potentially new settings
    requestData();
  });
};
// Event listeners for DOM content load
document.addEventListener('DOMContentLoaded', function () {
  initCurrencySwitcher();
  requestData();
  loadSettings();
  document.getElementById('save-button').addEventListener('click', saveSettings);
});

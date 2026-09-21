const STORAGE_KEY = 'northStarFavorites';

const products = [
  { id: 'country-sourdough', name: 'Country sourdough', category: 'Breads' },
  { id: 'seeded-whole-grain', name: 'Seeded whole grain', category: 'Breads' },
  { id: 'baguettes', name: 'Baguettes', category: 'Breads' },
  { id: 'butter-croissants', name: 'Butter croissants', category: 'Pastries' },
  { id: 'fruit-danishes', name: 'Seasonal fruit danishes', category: 'Pastries' },
  { id: 'cookies', name: 'Cookies', category: 'Pastries' },
  { id: 'lemon-poppy-cake', name: 'Lemon poppy seed cake', category: 'Cakes' },
  { id: 'chocolate-layer-cake', name: 'Chocolate layer cake', category: 'Cakes' },
  { id: 'custom-cakes', name: 'Custom celebration cake', category: 'Cakes' },
];

const requestLabels = {
  'pre-order': 'pre-order',
  question: 'question',
  event: 'event order',
};

let favorites = loadFavorites();

/* Favorites: storage */

function getProduct(id) {
  return products.find((product) => product.id === id);
}

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(getProduct) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Storage can be blocked (private mode); the list still works for this visit
  }
}

/* Favorites: products page */

function toggleFavorite(id) {
  const product = getProduct(id);
  const wasSaved = favorites.includes(id);

  favorites = wasSaved ? favorites.filter((savedId) => savedId !== id) : [...favorites, id];
  saveFavorites();
  updateFavoritesUI();
  setFavoritesStatus(wasSaved ? `${product.name} removed from your favorites.` : `${product.name} added to your favorites.`);
}

function clearFavorites() {
  favorites = [];
  saveFavorites();
  updateFavoritesUI();
  setFavoritesStatus('All favorites cleared.');
}

function setFavoritesStatus(message) {
  document.querySelector('#favorites-status').textContent = message;
}

function addFavoriteButtons() {
  document.querySelectorAll('[data-product]').forEach((item) => {
    const product = getProduct(item.dataset.product);
    if (!product) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'favorite-btn';
    button.dataset.id = product.id;
    button.setAttribute('aria-label', `Favorite ${product.name}`);
    button.innerHTML = '<span aria-hidden="true">♡</span> Favorite';
    item.append(' ', button);
  });
}

function updateFavoriteButtons() {
  document.querySelectorAll('.favorite-btn').forEach((button) => {
    const isSaved = favorites.includes(button.dataset.id);
    button.setAttribute('aria-pressed', String(isSaved));
    button.firstElementChild.textContent = isSaved ? '♥' : '♡';
  });
}

function renderFavoritesList() {
  const list = document.querySelector('#favorites-list');
  list.replaceChildren();

  favorites.forEach((id) => {
    const product = getProduct(id);
    const item = document.createElement('li');
    const remove = document.createElement('button');

    remove.type = 'button';
    remove.className = 'remove-btn';
    remove.dataset.id = id;
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${product.name} from favorites`);

    item.append(`${product.name} (${product.category}) `, remove);
    list.append(item);
  });

  document.querySelector('#favorites-empty').hidden = favorites.length > 0;
  document.querySelector('#favorites-actions').hidden = favorites.length === 0;
}

function updateFavoritesUI() {
  updateFavoriteButtons();
  renderFavoritesList();
}

function handleFavoritesClick(event) {
  const toggle = event.target.closest('.favorite-btn, .remove-btn');

  if (toggle) {
    toggleFavorite(toggle.dataset.id);
    // A removed list button no longer exists, so move focus somewhere stable
    if (toggle.classList.contains('remove-btn')) {
      document.querySelector('#favorites h2').focus();
    }
  } else if (event.target.closest('#clear-favorites')) {
    clearFavorites();
    document.querySelector('#favorites h2').focus();
  }
}

function initFavorites() {
  addFavoriteButtons();
  updateFavoritesUI();
  document.querySelector('main').addEventListener('click', handleFavoritesClick);
}

/* Contact form */

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isMonday(dateString) {
  return new Date(`${dateString}T00:00:00`).getDay() === 1;
}

// Each validator returns an error message, or '' when the value is fine
const validators = {
  name(value) {
    const name = value.trim();
    if (!name) return 'Please enter your name.';
    if (name.length < 2) return 'Your name needs at least 2 characters.';
    return '';
  },

  email(value) {
    const email = value.trim();
    if (!email) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Enter a valid email address, like name@example.com.';
    }
    return '';
  },

  'request-type'(value) {
    return value ? '' : 'Please choose a request type.';
  },

  'pickup-date'(value, requestType) {
    if (!value) {
      return requestType === 'pre-order' || requestType === 'event'
        ? 'Please choose a pickup date for your order.'
        : '';
    }
    if (value < todayString()) return 'Pickup date cannot be in the past.';
    if (isMonday(value)) return 'We are closed on Mondays. Please choose another day.';
    return '';
  },

  'item-details'(value) {
    const details = value.trim();
    if (!details) return 'Please tell us which items you want or what you would like to ask.';
    if (details.length < 5) return 'Please add a little more detail (at least 5 characters).';
    if (details.length > 500) return 'Please keep this under 500 characters.';
    return '';
  },
};

function getFields(form) {
  return Object.keys(validators).map((id) => form.elements[id]);
}

function setError(field, message) {
  document.querySelector(`#${field.id}-error`).textContent = message;

  if (message) {
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
}

function validateField(field) {
  const requestType = field.form.elements['request-type'].value;
  const message = validators[field.id](field.value, requestType);
  setError(field, message);
  return message === '';
}

function prefillFromFavorites(form) {
  const details = form.elements['item-details'];
  if (favorites.length === 0 || details.value.trim()) return;

  const names = favorites.map((id) => getProduct(id).name);
  details.value = `Pre-order request: ${names.join(', ')}`;
  form.elements['request-type'].value = 'pre-order';

  const note = document.querySelector('#prefill-note');
  note.textContent = 'We filled in your saved favorites. You can edit them before sending.';
  note.hidden = false;
}

function showConfirmation(form) {
  const name = form.elements.name.value.trim();
  const type = requestLabels[form.elements['request-type'].value];

  document.querySelector('#form-status').textContent =
    `Thank you, ${name}! We received your ${type} and will reply by email within one business day.`;
  document.querySelector('#prefill-note').hidden = true;
  form.reset();
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector('#form-status');
  status.textContent = '';

  const invalidFields = getFields(form).filter((field) => !validateField(field));

  if (invalidFields.length > 0) {
    invalidFields[0].focus();
    return;
  }
  showConfirmation(form);
}

// Once a field shows an error, re-check it while the user types so the message clears
function handleFieldChange(event) {
  const form = event.currentTarget;
  const field = event.target;

  if (field.id in validators && field.hasAttribute('aria-invalid')) {
    validateField(field);
  }
  if (field.id === 'request-type') {
    const pickup = form.elements['pickup-date'];
    if (pickup.hasAttribute('aria-invalid')) validateField(pickup);
  }
}

function initContactForm() {
  const form = document.querySelector('#contact-form');

  form.elements['pickup-date'].min = todayString();
  prefillFromFavorites(form);

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFieldChange);
  form.addEventListener('change', handleFieldChange);
}

if (document.querySelector('#favorites')) initFavorites();
if (document.querySelector('#contact-form')) initContactForm();

// ==========================================
// APP STATE & CONFIGURATION
// ==========================================
const DEFAULTS = {
  region: 'US',
  language: 'en',
  limit: 15,
  theme: 'dark'
};

let appState = {
  region: localStorage.getItem('gnews_region') || DEFAULTS.region,
  language: localStorage.getItem('gnews_language') || DEFAULTS.language,
  limit: parseInt(localStorage.getItem('gnews_limit'), 10) || DEFAULTS.limit,
  theme: localStorage.getItem('gnews_theme') || DEFAULTS.theme,
  currentCategory: 'headlines', // 'headlines' or TOPIC values
  currentSearch: ''
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const regionLangBadge = document.getElementById('region-lang-badge');

const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const settingsRegionSelect = document.getElementById('settings-region');
const settingsLanguageSelect = document.getElementById('settings-language');
const settingsLimitInput = document.getElementById('settings-limit');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('settings-cancel-btn');
const modalOverlay = document.getElementById('modal-overlay');

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryNav = document.getElementById('category-nav');
const appLogoLink = document.getElementById('app-logo-link');

const newsSectionTitle = document.getElementById('news-section-title');
const newsSectionSubtitle = document.getElementById('news-section-subtitle');
const newsContainer = document.getElementById('news-container');
const skeletonContainer = document.getElementById('skeleton-container');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const retryBtn = document.getElementById('retry-btn');

// ==========================================
// THEME MANAGEMENT
// ==========================================
function initTheme() {
  htmlElement.setAttribute('data-theme', appState.theme);
}

function toggleTheme() {
  const newTheme = appState.theme === 'dark' ? 'light' : 'dark';
  appState.theme = newTheme;
  htmlElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('gnews_theme', newTheme);
}

// ==========================================
// MODAL MANAGEMENT
// ==========================================
function openSettingsModal() {
  // Populate form with current state
  settingsRegionSelect.value = appState.region;
  settingsLanguageSelect.value = appState.language;
  settingsLimitInput.value = appState.limit;

  // Show modal
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

function saveSettings(e) {
  e.preventDefault();

  const newRegion = settingsRegionSelect.value;
  const newLanguage = settingsLanguageSelect.value;
  const newLimit = parseInt(settingsLimitInput.value, 10) || DEFAULTS.limit;

  // Update state
  appState.region = newRegion;
  appState.language = newLanguage;
  appState.limit = newLimit;

  // Save to LocalStorage
  localStorage.setItem('gnews_region', newRegion);
  localStorage.setItem('gnews_language', newLanguage);
  localStorage.setItem('gnews_limit', newLimit);

  // Update UI components
  updateBadge();
  closeSettingsModal();

  // Reload feed
  loadFeed();
}

function updateBadge() {
  regionLangBadge.textContent = `${appState.region} - ${appState.language}`;
}

// ==========================================
// NEWS FETCHING & RENDERING
// ==========================================
async function loadFeed() {
  // Reset containers
  errorMessage.classList.add('hidden');
  newsContainer.classList.add('hidden');
  skeletonContainer.classList.remove('hidden');

  // Build API Query URL
  let queryParams = new URLSearchParams({
    region: appState.region,
    language: appState.language,
    limit: appState.limit
  });

  if (appState.currentSearch) {
    queryParams.append('search', appState.currentSearch);
    newsSectionTitle.textContent = `Search: "${appState.currentSearch}"`;
    newsSectionSubtitle.textContent = `Showing search matches in ${appState.region} (${appState.language})`;
  } else {
    queryParams.append('category', appState.currentCategory);
    const catName = appState.currentCategory.charAt(0).toUpperCase() + appState.currentCategory.slice(1);
    newsSectionTitle.textContent = catName === 'Headlines' ? 'Top Headlines' : `${catName} News`;
    newsSectionSubtitle.textContent = `Top stories filtered by category in ${appState.region} (${appState.language})`;
  }

  try {
    const response = await fetch(`/api/news?${queryParams.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.details || 'Failed to fetch news data');
    }

    const data = await response.json();
    renderArticles(data.articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    showError(error.message);
  }
}

function renderArticles(articles) {
  skeletonContainer.classList.add('hidden');
  newsContainer.innerHTML = '';

  if (!articles || articles.length === 0) {
    newsContainer.innerHTML = `
      <div class="no-news-box">
        <p>No articles found. Try changing your filters, search term, or settings.</p>
      </div>
    `;
    newsContainer.classList.remove('hidden');
    return;
  }

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'news-card';

    // Format Date
    let dateStr = 'Recently';
    if (article.pubDate) {
      const date = new Date(article.pubDate);
      dateStr = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    card.innerHTML = `
      <div class="card-meta">
        <span class="card-source">${escapeHTML(article.source)}</span>
        <span class="card-date">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${dateStr}
        </span>
      </div>
      <h3 class="card-title">${escapeHTML(article.title)}</h3>
      <p class="card-desc">${escapeHTML(article.description || 'No description available for this article.')}</p>
      <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="card-link">
        Read Full Article
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
    `;

    newsContainer.appendChild(card);
  });

  newsContainer.classList.remove('hidden');
}

function showError(msg) {
  skeletonContainer.classList.add('hidden');
  newsContainer.classList.add('hidden');
  errorText.textContent = msg || 'Failed to fetch the news articles. Please verify your internet connection or settings.';
  errorMessage.classList.remove('hidden');
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// NAVIGATION & EVENT HANDLERS
// ==========================================
function handleCategoryClick(e) {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;

  // Update active style
  const activeBtn = categoryNav.querySelector('.nav-btn.active');
  if (activeBtn) activeBtn.classList.remove('active');
  btn.classList.add('active');

  // Update state and load
  appState.currentCategory = btn.dataset.category;
  appState.currentSearch = '';
  searchInput.value = '';

  loadFeed();
}

function handleSearchSubmit(e) {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  // Clear category nav active selection
  const activeBtn = categoryNav.querySelector('.nav-btn.active');
  if (activeBtn) activeBtn.classList.remove('active');

  appState.currentSearch = query;
  appState.currentCategory = '';

  loadFeed();
}

function resetFeed(e) {
  e.preventDefault();
  
  // Set category to Headlines
  const activeBtn = categoryNav.querySelector('.nav-btn.active');
  if (activeBtn) activeBtn.classList.remove('active');
  document.getElementById('cat-headlines').classList.add('active');

  appState.currentCategory = 'headlines';
  appState.currentSearch = '';
  searchInput.value = '';

  loadFeed();
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  initTheme();
  updateBadge();

  // Event Listeners
  themeToggleBtn.addEventListener('click', toggleTheme);
  settingsBtn.addEventListener('click', openSettingsModal);
  modalCloseBtn.addEventListener('click', closeSettingsModal);
  modalCancelBtn.addEventListener('click', closeSettingsModal);
  modalOverlay.addEventListener('click', closeSettingsModal);
  settingsForm.addEventListener('submit', saveSettings);
  
  categoryNav.addEventListener('click', handleCategoryClick);
  searchForm.addEventListener('submit', handleSearchSubmit);
  appLogoLink.addEventListener('click', resetFeed);
  retryBtn.addEventListener('click', loadFeed);

  // Load initial feed
  loadFeed();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);

async function requestApi(action, options = {}) {
  const parameters = new URLSearchParams({ action, ...(options.parameters || {}) });
  const requestOptions = {
    method: options.method || 'GET',
    headers: { Accept: 'application/json' }
  };

  if (options.body) {
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`api.php?${parameters.toString()}`, requestOptions);
  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error('The server returned an invalid response. Check that PHP is running.');
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result.data;
}

function getItems() {
  return requestApi('items');
}

function getMyReports() {
  return requestApi('my-reports');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2200);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('campusfind_theme', theme);

  const button = document.querySelector('[data-theme-toggle]');
  if (button) {
    const label = theme === 'dark' ? '☀️' : '🌙';
    button.textContent = label;
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem('campusfind_theme') || 'light';
  applyTheme(savedTheme);

  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    showToast(`Switched to ${theme} theme`, 'success');
  });
}

function setupMobileNav() {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('is-open'));
  });
}

function getCurrentPage() {
  return document.body.dataset.page || '';
}

function createItemCard(item) {
  const actionLabel = item.type === 'lost' ? 'Report status' : 'Claim item';
  return `
    <article class="item-card">
      <div class="card-top">
        <span class="badge ${item.type}">${item.type}</span>
        <span class="date">${formatDate(item.date)}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta-row">
          <span class="meta-pill">📁 ${escapeHtml(item.category)}</span>
          <span class="meta-pill">📍 ${escapeHtml(item.location)}</span>
        </div>
        <p>${escapeHtml(item.description.slice(0, 110))}${item.description.length > 110 ? '...' : ''}</p>
        <div class="card-actions">
          <span class="subtle-text">Reported by ${escapeHtml(item.contactName || item.reporter || 'Campus member')}</span>
          <a class="inline-action" href="item-details.html?id=${encodeURIComponent(item.id)}">${actionLabel}</a>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState(targetId, heading, message) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty-state">
      <strong>${heading}</strong>
      <span>${message}</span>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function renderHomePage(items) {
  const container = document.getElementById('featured-items');
  if (!container) return;

  const recentItems = items.slice(0, 3);
  if (!recentItems.length) {
    renderEmptyState('featured-items', 'No reports yet', 'New lost and found reports will appear here.');
    return;
  }
  container.innerHTML = recentItems.map(createItemCard).join('');
}

function renderBrowsePage(items) {
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const categoryFilter = document.getElementById('category-filter');
  const sortFilter = document.getElementById('sort-filter');
  const container = document.getElementById('browse-grid');

  if (!container) return;

  const render = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const type = typeFilter?.value || 'all';
    const category = categoryFilter?.value || 'all';
    const sort = sortFilter?.value || 'newest';

    let matchingItems = items.filter((item) => {
      const matchesType = type === 'all' || item.type === type;
      const matchesCategory = category === 'all' || item.category === category;
      const text = `${item.title} ${item.location} ${item.description} ${item.category}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      return matchesType && matchesCategory && matchesQuery;
    });

    matchingItems.sort((a, b) => {
      const dateA = new Date(a.date || a.submittedAt).getTime();
      const dateB = new Date(b.date || b.submittedAt).getTime();
      return sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    if (!matchingItems.length) {
      renderEmptyState('browse-grid', 'No matching items found', 'Try another keyword or reset your filter selection.');
      return;
    }

    container.innerHTML = matchingItems.map(createItemCard).join('');
  };

  [searchInput, typeFilter, categoryFilter, sortFilter].forEach((field) => {
    if (field) field.addEventListener('input', render);
    if (field) field.addEventListener('change', render);
  });

  render();
}

function validateReportForm(form, type) {
  const fields = {
    itemName: document.getElementById('item-name'),
    category: document.getElementById('item-category'),
    location: document.getElementById('item-location'),
    date: document.getElementById('item-date'),
    description: document.getElementById('item-description'),
    contactName: document.getElementById('contact-name'),
    contactPhone: document.getElementById('contact-phone'),
    email: document.getElementById('contact-email')
  };

  const values = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input ? input.value.trim() : '']));

  if (!values.itemName || !values.category || !values.location || !values.date || !values.description || !values.contactName || !values.contactPhone) {
    throw new Error('Please fill in all required fields.');
  }

  if (values.description.length < 20) {
    throw new Error('Description must include at least 20 characters.');
  }

  if (values.contactPhone.replace(/\D/g, '').length < 10) {
    throw new Error('Please enter a valid 10-digit contact number.');
  }

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    throw new Error('Please enter a valid email address.');
  }

  const selectedDate = new Date(`${values.date}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) {
    throw new Error('Please provide a valid date.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate > today) {
    throw new Error('Please select today or a past date.');
  }

  const item = {
    title: values.itemName,
    type,
    category: values.category,
    location: values.location,
    date: values.date,
    description: values.description,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    email: values.email,
    reporter: values.contactName
  };

  return item;
}

function initializeReportForm() {
  const form = document.getElementById('report-form');
  if (!form) return;

  const page = getCurrentPage();
  const reportType = page.includes('lost') ? 'lost' : 'found';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const newItem = validateReportForm(form, reportType);
      await requestApi('create-item', { method: 'POST', body: newItem });
      form.reset();
      showToast('Your report was submitted successfully.', 'success');
      setTimeout(() => {
        window.location.href = 'my-reports.html';
      }, 900);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function initializeDetailsPage() {
  const container = document.getElementById('item-details-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');
  const item = itemId
    ? await requestApi('item', { parameters: { id: itemId } })
    : null;

  if (!item) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Item not found</strong>
        <span>We could not locate this item. Please browse the list and try another match.</span>
      </div>
    `;
    return;
  }

  document.getElementById('detail-title').textContent = item.title;
  document.getElementById('detail-type').textContent = item.type.toUpperCase();
  document.getElementById('detail-type').className = `badge ${item.type}`;
  document.getElementById('detail-category').textContent = item.category;
  document.getElementById('detail-location').textContent = item.location;
  document.getElementById('detail-date').textContent = formatDate(item.date);
  document.getElementById('detail-description').textContent = item.description;
  document.getElementById('detail-contact-phone').textContent = item.contactPhone || 'Not shared';
  document.getElementById('detail-contact-email').textContent = item.email || 'Not shared';
  document.getElementById('detail-reported-by').textContent = item.reporter || item.contactName || 'Campus member';

  const claimCount = item.claimCount || 0;
  document.getElementById('claim-count').textContent = `${claimCount} request${claimCount === 1 ? '' : 's'}`;

  const claimForm = document.getElementById('claim-form');
  if (claimForm) {
    claimForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('claim-name').value.trim();
      const phone = document.getElementById('claim-phone').value.trim();
      const message = document.getElementById('claim-message').value.trim();

      if (!name || !phone || !message) {
        showToast('Please fill in all fields before submitting a claim request.', 'error');
        return;
      }

      try {
        const result = await requestApi('create-claim', {
          method: 'POST',
          body: { itemId: item.id, name, phone, message }
        });
        claimForm.reset();
        document.getElementById('claim-count').textContent =
          `${result.claimCount} request${result.claimCount === 1 ? '' : 's'}`;
        showToast('Your claim request was submitted successfully.', 'success');
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }
}

async function initializeMyReportsPage() {
  const container = document.getElementById('my-reports-list');
  if (!container) return;

  const reports = await getMyReports();

  if (!reports.length) {
    renderEmptyState('my-reports-list', 'No reports yet', 'Report a lost or found item to track it here.');
    return;
  }

  function renderReports() {
    container.innerHTML = reports.map((item) => `
      <article class="report-card">
        <div class="card-top">
          <span class="badge ${item.type}">${item.type}</span>
          <span class="date">${formatDate(item.date)}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="meta-row">
            <span class="meta-pill">📁 ${escapeHtml(item.category)}</span>
            <span class="meta-pill">📍 ${escapeHtml(item.location)}</span>
          </div>
          <p>${escapeHtml(item.description)}</p>
          <div class="card-actions">
            <a class="inline-action" href="item-details.html?id=${encodeURIComponent(item.id)}">Open</a>
            <button class="inline-action ghost" type="button" data-delete-report="${escapeHtml(item.id)}">Delete</button>
          </div>
        </div>
      </article>
    `).join('');

    container.querySelectorAll('[data-delete-report]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-delete-report');
        if (!id) return;
        try {
          await requestApi('delete-item', { method: 'POST', body: { id } });
          const reportIndex = reports.findIndex((report) => report.id === id);
          if (reportIndex !== -1) reports.splice(reportIndex, 1);
          if (!reports.length) {
            renderEmptyState('my-reports-list', 'No reports yet', 'Report a lost or found item to track it here.');
          } else {
            renderReports();
          }
          showToast('Report deleted successfully.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  }

  renderReports();
}

function initializeHomeStats(items) {
  const totalItems = items.length;
  const lostCount = items.filter((item) => item.type === 'lost').length;
  const foundCount = items.filter((item) => item.type === 'found').length;

  const statEls = {
    total: document.getElementById('total-items'),
    lost: document.getElementById('lost-items'),
    found: document.getElementById('found-items')
  };

  if (statEls.total) statEls.total.textContent = totalItems;
  if (statEls.lost) statEls.lost.textContent = lostCount;
  if (statEls.found) statEls.found.textContent = foundCount;
}

document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();
  setupMobileNav();

  const page = getCurrentPage();
  if (page === 'home') {
    try {
      const items = await getItems();
      renderHomePage(items);
      initializeHomeStats(items);
    } catch (error) {
      console.error('Unable to load items:', error);
      renderEmptyState('featured-items', 'Unable to load items', 'Please check the PHP and database setup, then reload this page.');
      showToast(error.message, 'error');
    }
  }

  if (page === 'browse') {
    try {
      renderBrowsePage(await getItems());
    } catch (error) {
      console.error('Unable to load items:', error);
      renderEmptyState('browse-grid', 'Unable to load items', 'Please check the PHP and database setup, then reload this page.');
      showToast(error.message, 'error');
    }
  }

  if (page === 'lost-report' || page === 'found-report') {
    initializeReportForm();
  }

  if (page === 'item-details') {
    try {
      await initializeDetailsPage();
    } catch (error) {
      console.error('Unable to load item details:', error);
      renderEmptyState('item-details-container', 'Unable to load item details', 'Please check the PHP and database setup, then reload this page.');
      showToast(error.message, 'error');
    }
  }

  if (page === 'my-reports') {
    try {
      await initializeMyReportsPage();
    } catch (error) {
      console.error('Unable to load your reports:', error);
      renderEmptyState('my-reports-list', 'Unable to load reports', 'Please check the PHP and database setup, then reload this page.');
      showToast(error.message, 'error');
    }
  }
});

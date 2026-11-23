javascript
const $ = id => document.getElementById(id);

const read = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const save = (key, data) =>
  localStorage.setItem(key, JSON.stringify(data));

const cleanPhone = value =>
  String(value || '').replace(/\D/g, '');

const validPhone = value =>
  /^[6-9]\d{9}$/.test(cleanPhone(value));

const safe = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');

  clearTimeout(window.rrToastTimer);

  window.rrToastTimer = setTimeout(
    () => t.classList.remove('show'),
    2600
  );
}

function waLink(phone, message) {
  let n = cleanPhone(phone);

  if (n.length === 10) n = '91' + n;

  return 'https://wa.me/' + n +
    '?text=' + encodeURIComponent(message);
}

function makeRef() {
  const day = new Date()
    .toISOString()
    .slice(2, 10)
    .replaceAll('-', '');

  return 'RR-' + day + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function updateStats() {
  $('donorCount').textContent =
    read('rr_donors').length;

  if ($('requestCount')) {
    $('requestCount').textContent =
      read('rr_requests').length;
  }
}

function shareText(title, textToShare) {
  if (navigator.share) {
    navigator.share({
      title,
      text: textToShare
    }).catch(() => {});
  } else if (
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {
    navigator.clipboard.writeText(textToShare)
      .then(() => toast('Request summary copied!'))
      .catch(() => toast('Copy is unavailable in this browser.'));
  } else {
    toast('Sharing is not supported in this browser.');
  }
}

function renderDonors() {
  const group = $('bloodFilter').value.toLowerCase();
  const city = $('cityFilter').value.trim().toLowerCase();

  const donors = read('rr_donors').filter(d =>
    (!group || d.blood.toLowerCase() === group) &&
    (!city || d.city.toLowerCase().includes(city)) &&
    d.available
  );

  $('donorList').innerHTML = donors.length
    ? donors.map(d => `
      <article class="donorCard">
        <div class="donorTop">
          <div class="avatar">
            ${safe(d.name.slice(0, 1).toUpperCase())}
          </div>

          <div>
            <h3>${safe(d.name)}</h3>
            <small>Community donor profile</small>
          </div>

          <span class="blood">${safe(d.blood)}</span>
        </div>

        <div class="donorMeta">
          <span>📍 ${safe(d.city)}</span>
          <span class="available">● Available*</span>
        </div>

        <div class="cardActions">
          <a class="btn small wide"
             target="_blank"
             rel="noopener"
             href="${waLink(
               d.phone,
               'Hello ' + d.name +
               ', I found your donor profile on RedRelay. Are you available to discuss a blood donation request?'
             )}">
            WhatsApp ↗
          </a>

          <button class="btn small secondary"
                  type="button"
                  data-copy="${safe(d.city + ' · ' + d.blood)}">
            Copy info
          </button>
        </div>
      </article>
    `).join('')
    : `
      <div class="empty">
        <span class="emptyIcon">⌕</span>
        No available profiles match these filters yet.
        <br>
        Try another location or blood group.
      </div>
    `;

  updateStats();
}

function renderRequests() {
  const requests = read('rr_requests');

  $('requestFeed').innerHTML = requests.length
    ? requests.slice().reverse().map(r => {
      const summary =
        `RedRelay request ${r.ref}\n` +
        `Blood group: ${r.blood}\n` +
        `Hospital: ${r.hospital}\n` +
        `Location: ${r.city}\n` +
        `Units requested: ${r.units}\n` +
        `Contact: ${r.phone}\n` +
        `Please confirm all details with the hospital blood bank.`;

      return `
        <article class="feedCard">
          <h3>${safe(r.name)} needs a connection</h3>

          <span class="blood">${safe(r.blood)}</span>

          <div class="requestRef">
            ${safe(r.ref || 'RR-DEMO')}
          </div>

          <p>
            🏥 ${safe(r.hospital)}
            <br>
            📍 ${safe(r.city)}
            <br>
            🩸 Units requested: ${safe(r.units)}
            <br>
            ${r.note ? 'Note: ' + safe(r.note) + '<br>' : ''}
            <small>Posted ${safe(r.date)}</small>
          </p>

          <div class="cardActions">
            <a class="btn small wide"
               target="_blank"
               rel="noopener"
               href="${waLink(
                 r.phone,
                 'Hello, I saw your blood request ' +
                 (r.ref || '') +
                 ' on RedRelay. I would like to discuss how I may help.'
               )}">
              Contact requester ↗
            </a>

            <button class="btn small secondary"
                    type="button"
                    data-share="${safe(encodeURIComponent(summary))}">
              Share request
            </button>
          </div>
        </article>
      `;
    }).join('')
    : `
      <div class="empty">
        <span class="emptyIcon">♡</span>
        No requests posted yet.
        New requests will appear here.
      </div>
    `;

  updateStats();
}

// Donor registration
$('donorForm').addEventListener('submit', e => {
  e.preventDefault();

  const age = Number($('donorAge').value);
  const phone = $('donorPhone').value.trim();

  if (age < 18) {
    $('donorMessage').textContent =
      'Donor registration is limited to adults aged 18+. Please do not register if you are under 18.';
    return;
  }

  if (!validPhone(phone)) {
    $('donorMessage').textContent =
      'Enter a valid 10-digit Indian mobile number.';
    return;
  }

  const donors = read('rr_donors');

  donors.push({
    id: Date.now(),
    name: $('donorName').value.trim(),
    age,
    blood: $('donorBlood').value,
    city: $('donorCity').value.trim(),
    phone,
    available: $('donorAvailable').checked
  });

  save('rr_donors', donors);

  $('donorForm').reset();
  $('donorAvailable').checked = true;

  $('donorMessage').textContent =
    'Demo profile saved in this browser. Thank you for joining!';

  renderDonors();
  toast('Donor profile added to this demo');
});

// Blood request form
$('requestForm').addEventListener('submit', e => {
  e.preventDefault();

  const phone = $('requestPhone').value.trim();

  if (!validPhone(phone)) {
    $('requestMessage').textContent =
      'Enter a valid 10-digit Indian mobile number.';
    return;
  }

  const requests = read('rr_requests');

  const item = {
    id: Date.now(),
    ref: makeRef(),
    name: $('patientName').value.trim(),
    phone,
    hospital: $('hospital').value.trim(),
    blood: $('requestBlood').value,
    units: $('units').value,
    city: $('requestCity').value.trim(),
    note: $('requestNote').value.trim(),
    date: new Date().toLocaleString()
  };

  requests.push(item);
  save('rr_requests', requests);

  $('requestForm').reset();

  $('requestMessage').textContent =
    'Request posted. Your reference ID is ' + item.ref + '.';

  renderRequests();

  toast('Request published · ' + item.ref);

  $('requests').scrollIntoView({
    behavior: 'smooth'
  });
});

// Donor search
$('searchBtn').addEventListener('click', renderDonors);

$('bloodFilter').addEventListener(
  'change',
  renderDonors
);

$('cityFilter').addEventListener(
  'input',
  renderDonors
);

$('resetSearch').addEventListener('click', () => {
  $('bloodFilter').value = '';
  $('cityFilter').value = '';

  renderDonors();
  toast('Search filters cleared');
});

// Quick blood group buttons
document.querySelectorAll('[data-group]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('bloodFilter').value =
      btn.dataset.group.replace('−', '-');

    $('donors').scrollIntoView({
      behavior: 'smooth'
    });

    renderDonors();
  });
});

// Share and copy buttons
document.addEventListener('click', e => {
  const share = e.target.closest('[data-share]');

  if (share) {
    try {
      shareText(
        'RedRelay blood request',
        decodeURIComponent(share.dataset.share)
      );
    } catch {}
  }

  const copy = e.target.closest('[data-copy]');

  if (copy && navigator.clipboard) {
    navigator.clipboard.writeText(copy.dataset.copy)
      .then(() => toast('Profile info copied'));
  }
});

// Mobile navigation
$('menuBtn').addEventListener('click', () => {
  $('navLinks').classList.toggle('open');
});

$('navLinks').querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    $('navLinks').classList.remove('open');
  });
});

// Footer year
$('year').textContent = new Date().getFullYear();

// Initial loading
renderDonors();
renderRequests();
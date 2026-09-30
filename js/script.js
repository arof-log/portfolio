const video = document.getElementById('back');
const mainInner = document.getElementById('main_inner');

if (video && mainInner) {
  video.addEventListener('ended', () => {
    mainInner.classList.add('active');
  });
}

const gnbSwiper = new Swiper('#gnb', {
  wrapperClass: 'menu',
  slideClass: 'btn',
  slidesPerView: 'auto',
});

const wrapSwiper = new Swiper('#wrap', {
  wrapperClass: 'container',
  slideClass: 'section',
  direction: 'vertical',
  speed: 600,
  thumbs: {
    swiper: gnbSwiper,
    slideThumbActiveClass: 'active',
  },
  navigation: {
    nextEl: '.next',
    prevEl: '.prev',
  },
  pagination: {
    el: '.pager',
    clickable: true,
    bulletActiveClass: 'active',
  },
  mousewheel: true,
});

let worksSwiper = null;

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeImageSource(value = '') {
  const src = String(value).trim();
  if (/^https?:\/\//i.test(src) || src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
    return src;
  }
  return '';
}

function safeDetailPage(value = '') {
  const href = String(value).trim();
  return /^(?!https?:|javascript:|data:)[A-Za-z0-9_./%()-]+\.html(?:[?#].*)?$/.test(href) ? href : '#';
}

function renderWorks(works) {
  const list = document.getElementById('works-list');
  if (!list) return;

  const visibleWorks = works
    .filter((work) => work && work.published !== false)
    .sort((a, b) => Number(a.order ?? 9999) - Number(b.order ?? 9999));

  list.innerHTML = visibleWorks.map((work, index) => {
    const number = String(index + 1).padStart(2, '0');
    const title = escapeHTML(work.title || 'Untitled');
    const category = escapeHTML(work.category || '');
    const description = escapeHTML(work.description || '');
    const thumbnail = escapeHTML(safeImageSource(work.thumbnail));
    const href = escapeHTML(safeDetailPage(work.detailPage));
    const fancyboxAttrs = href === '#'
      ? ''
      : ' data-fancybox="portfolio" data-type="iframe"';

    return `
      <div class="item">
        <a href="${href}" class="work-card"${fancyboxAttrs}>
          <div class="thumb-box">
            <img src="${thumbnail}" alt="${title}" loading="lazy">
          </div>
          <div class="meta-info">
            <div class="top-row">
              <span class="index-num">No. ${number}</span>
              <span class="category-stamp">${category}</span>
            </div>
            <h3 class="project-title">${title}</h3>
            <p class="project-desc">${description}</p>
          </div>
        </a>
      </div>
    `;
  }).join('');

  if (worksSwiper) {
    worksSwiper.destroy(true, true);
  }

  worksSwiper = new Swiper('#works_inner', {
    wrapperClass: 'list',
    slideClass: 'item',
    slidesPerView: 'auto',
    spaceBetween: 80,
    speed: 900,
    nested: true,
    mousewheel: {
      enabled: true,
      sensitivity: 0.8,
      releaseOnEdges: true,
    },
  });

  Fancybox.bind('[data-fancybox]', {});
}

async function loadWorks() {
  const list = document.getElementById('works-list');
  try {
    const response = await fetch('./data/works.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`works.json: ${response.status}`);
    const works = await response.json();
    if (!Array.isArray(works)) throw new Error('works.json must be an array');
    renderWorks(works);
  } catch (error) {
    console.error('WORKS 데이터를 불러오지 못했습니다.', error);
    if (list) {
      list.innerHTML = '<p class="works-error">작품 목록을 불러오지 못했습니다.</p>';
    }
  }
}

function setupGuestbook() {
  const form = document.getElementById('guestbook-form');
  const status = document.getElementById('guestbook-status');
  const turnstileSlot = document.getElementById('turnstile-slot');
  if (!form || !status) return;

  let turnstileToken = '';
  let turnstileWidgetId = null;
  const siteKey = (form.dataset.turnstileSiteKey || '').trim();

  if (siteKey && turnstileSlot) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) {
        turnstileWidgetId = window.turnstile.render(turnstileSlot, {
          sitekey: siteKey,
          callback: (token) => {
            turnstileToken = token;
          },
          'expired-callback': () => {
            turnstileToken = '';
          },
        });
      }
    };
    document.head.appendChild(script);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const name = form.elements.name.value.trim();
    const message = form.elements.message.value.trim();
    const website = form.elements.website.value.trim();

    if (!name || !message) {
      status.textContent = '이름과 메시지를 모두 입력해주세요.';
      return;
    }

    if (name.length > 40 || message.length > 500) {
      status.textContent = '이름은 40자, 메시지는 500자 이내로 작성해주세요.';
      return;
    }

    submitButton.disabled = true;
    status.textContent = '메시지를 전송하고 있습니다.';

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message,
          website,
          turnstileToken,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || '메시지 전송에 실패했습니다.');
      }

      form.reset();
      turnstileToken = '';
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
      status.textContent = '메시지가 전송되었습니다. 감사합니다.';
    } catch (error) {
      console.error(error);
      status.textContent = error.message || '메시지 전송에 실패했습니다.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

loadWorks();
setupGuestbook();

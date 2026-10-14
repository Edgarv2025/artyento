/**
 * ARTES Y ENTRETENIMIENTO - SCRIPT PRINCIPAL
 * Funcionalidad nativa, ligera y accesible sin librerías externas
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initScrollReveal();
  initFaqAccordion();
  initGalleryLightbox();
  initSocialFeed();
  initClickTracking();
});

/**
 * 1. Menú Móvil Accesible
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!toggleBtn || !siteNav) return;

  const toggleMenu = (open) => {
    const isExpanded = open !== undefined ? open : toggleBtn.getAttribute('aria-expanded') !== 'true';
    toggleBtn.setAttribute('aria-expanded', isExpanded);
    toggleBtn.textContent = isExpanded ? 'Cerrar' : 'Menú';
    siteNav.classList.toggle('is-active', isExpanded);
    document.body.style.overflow = isExpanded ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', () => toggleMenu());

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (siteNav.classList.contains('is-active')) {
        toggleMenu(false);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('is-active')) {
      toggleMenu(false);
      toggleBtn.focus();
    }
  });
}

/**
 * 2. Aparición Suave al Desplazarse (Scroll Reveal)
 * Movimiento mínimo: opacidad y 12px de desplazamiento, 400ms
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return;

  // Si el usuario prefiere movimiento reducido, mostrar de inmediato
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealElements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/**
 * 3. Acordeón Simple de Preguntas Frecuentes
 */
function initFaqAccordion() {
  const faqButtons = document.querySelectorAll('.faq-button');

  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isCurrentlyOpen = item.classList.contains('is-open');

      // Cerrar los demás acordeones para mantener orden visual sobrio
      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('is-open');
        const otherBtn = other.querySelector('.faq-button');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });

      // Alternar el actual
      if (!isCurrentlyOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

/**
 * 4. Galería "Momentos Inolvidables" con Ampliación Modal (Lightbox)
 */
function initGalleryLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDesc = document.getElementById('lightbox-desc');
  const closeBtn = document.querySelector('.lightbox-close');
  let lastActiveElement = null;

  if (!lightbox || !lightboxImg) return;

  function openLightbox(src, title, desc, triggerEl) {
    lastActiveElement = triggerEl;
    lightboxImg.src = src;
    lightboxImg.alt = title || 'Fotografía de evento en Bogotá';
    if (lightboxTitle) lightboxTitle.textContent = title || '';
    if (lightboxDesc) lightboxDesc.textContent = desc || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    document.body.style.overflow = '';
    if (lastActiveElement) lastActiveElement.focus();
  }

  // Delegación de eventos para las tarjetas de galería
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.gallery-card:not(.is-placeholder)');
    if (card) {
      const img = card.querySelector('img');
      const title = card.getAttribute('data-title') || (img ? img.alt : '');
      const desc = card.getAttribute('data-desc') || '';
      if (img && img.src) {
        openLightbox(img.src, title, desc, card);
      }
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
}

/**
 * 5. Carga Dinámica de Redes Sociales desde redes.json
 */
async function initSocialFeed() {
  const container = document.getElementById('social-feed-container');
  if (!container) return;

  try {
    const response = await fetch('redes.json');
    if (!response.ok) return;
    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) return;

    // Renderizar miniaturas limpias
    container.innerHTML = items.map(item => `
      <a href="${item.enlace}" target="_blank" rel="noopener noreferrer" class="social-thumb" title="Ver publicación de ${item.red}: ${item.titulo}">
        <img src="${item.imagen}" alt="${item.titulo}" width="300" height="300" loading="lazy" decoding="async">
        <span class="social-thumb-badge">${item.red}</span>
      </a>
    `).join('');
  } catch (err) {
    // Si falla la petición fetch local, el contenido estático del HTML permanece
  }
}

/**
 * 6. Medición de Eventos y Clics hacia WhatsApp y Redes Sociales
 */
function initClickTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || !link.href) return;

    let eventLabel = null;
    const url = link.href;

    if (url.includes('wa.me') || url.includes('whatsapp.com')) {
      eventLabel = 'WhatsApp Click';
    } else if (url.includes('instagram.com')) {
      eventLabel = 'Instagram Click';
    } else if (url.includes('tiktok.com')) {
      eventLabel = 'TikTok Click';
    } else if (url.includes('facebook.com')) {
      eventLabel = 'Facebook Click';
    }

    if (eventLabel && window.cloudflare && window.cloudflare.analytics) {
      try {
        window.cloudflare.analytics.track({ name: eventLabel, url });
      } catch (err) {
        // Silencioso
      }
    }
  });
}

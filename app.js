/**
 * Thank You Brand — Interactive Application Logic
 * Handles: Nav, Tabs, Scroll animations, Contact form, Footer links
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ============================================================
  // 1. STICKY HEADER SCROLL BEHAVIOR
  // ============================================================
  const header = document.getElementById('main-header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // ============================================================
  // 2. MOBILE HAMBURGER MENU
  // ============================================================
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const drawerOverlay = document.getElementById('mobile-drawer-overlay');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerLinks = document.querySelectorAll('.drawer-link, .drawer-cta');

  function openDrawer() {
    drawerOverlay.classList.add('open');
    hamburgerBtn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerOverlay.classList.remove('open');
    hamburgerBtn.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);

  drawerOverlay?.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // ============================================================
  // 3. SOLUTION TABS
  // ============================================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function activateTab(targetTab) {
    // Deactivate all
    tabBtns.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    // Activate target
    const targetBtn = document.querySelector(`[data-tab="${targetTab}"]`);
    const targetPanel = document.getElementById(`panel-${targetTab}`);

    if (targetBtn) {
      targetBtn.classList.add('active');
      targetBtn.setAttribute('aria-selected', 'true');
    }

    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Re-init icons in case they appear in the newly shown panel
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      activateTab(tab);
    });
  });

  // Footer solution links that activate a specific tab
  document.querySelectorAll('[data-tab-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      const tabTarget = link.getAttribute('data-tab-target');
      if (tabTarget) {
        setTimeout(() => activateTab(tabTarget), 300); // slight delay for scroll to complete
      }
    });
  });

  // ============================================================
  // 4. SCROLL REVEAL ANIMATIONS
  // ============================================================
  const fadeElements = document.querySelectorAll(
    '.approach-card, .about-left, .about-right, .panel-content-col, .panel-image-col'
  );

  fadeElements.forEach(el => {
    el.classList.add('fade-up');
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger sibling cards
        const siblings = Array.from(entry.target.parentElement?.children || []);
        const index = siblings.indexOf(entry.target);
        const delay = index * 100;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  fadeElements.forEach(el => revealObserver.observe(el));

  // ============================================================
  // 5. CONTACT FORM
  // ============================================================
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-form-status');
  const contactSubmitBtn = document.getElementById('contact-submit-btn');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name            = document.getElementById('contact-name')?.value.trim();
      const email           = document.getElementById('contact-email')?.value.trim();
      const interest        = document.getElementById('contact-interest')?.value;
      const investmentLever = document.getElementById('contact-lever')?.value;
      const budget          = document.getElementById('contact-budget')?.value;
      const message         = document.getElementById('contact-message')?.value.trim();

      if (!name || !email || !interest) {
        showStatus('error', 'Please fill in all required fields.');
        return;
      }

      // Submit form
      const originalText = contactSubmitBtn.innerHTML;
      contactSubmitBtn.disabled = true;
      contactSubmitBtn.innerHTML = `
        <span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,0.3);border-top-color:rgba(0,0,0,0.8);border-radius:50%;animation:spin 0.7s linear infinite;"></span>
        Sending...
      `;

      // Inject spinner keyframe if not present
      if (!document.getElementById('spin-style')) {
        const s = document.createElement('style');
        s.id = 'spin-style';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, interest, investmentLever, budget, message })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          handleSuccess(originalText, result.message);
        } else {
          showStatus('error', result.message || 'Unable to send email. Please try again.');
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.innerHTML = originalText;
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      } catch (err) {
        showStatus('error', 'Failed to send message. Please check your network connection.');
        contactSubmitBtn.disabled = false;
        contactSubmitBtn.innerHTML = originalText;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }

  function handleSuccess(originalBtnText, successMsg) {
    showStatus('success', successMsg || `✓ Thank you! We'll be in touch with you shortly to start building together.`);
    contactForm.reset();
    contactSubmitBtn.disabled = false;
    contactSubmitBtn.innerHTML = originalBtnText;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      if (contactStatus) {
        contactStatus.style.opacity = '0';
        setTimeout(() => {
          contactStatus.textContent = '';
          contactStatus.className = 'form-status-msg';
          contactStatus.style.opacity = '';
        }, 400);
      }
    }, 7000);
  }

  function showStatus(type, msg) {
    if (!contactStatus) return;
    contactStatus.className = `form-status-msg ${type}`;
    contactStatus.textContent = msg;
  }

  // ============================================================
  // 6. SMOOTH ACTIVE NAV HIGHLIGHTING
  // ============================================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollPos = window.scrollY + 80 + 80;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active-nav');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active-nav');
          }
        });
      }
    });
  }

  // Simple scroll position watcher
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveNav();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ============================================================
  // 7. DYNAMIC FOOTER YEAR
  // ============================================================
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ============================================================
  // 8. TAB KEYBOARD NAVIGATION (ACCESSIBILITY)
  // ============================================================
  const tabsContainer = document.getElementById('solutions-tabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabsContainer.querySelectorAll('.tab-btn'));
      const currentIndex = tabs.indexOf(document.activeElement);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[prevIndex].focus();
        tabs[prevIndex].click();
      }
    });
  }

  // ============================================================
  // 9. HERO PARALLAX SUBTLE EFFECT
  // ============================================================
  const heroSection = document.getElementById('hero');
  if (heroSection && window.innerWidth > 900) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        const offset = window.scrollY * 0.25;
        const bgGrid = heroSection.querySelector('.hero-bg-grid');
        if (bgGrid) {
          bgGrid.style.transform = `translateY(${offset}px)`;
        }
      }
    }, { passive: true });
  }

  // ============================================================
  // 10. PORTFOLIO LIGHTBOX MODAL
  // ============================================================
  const lightbox = document.getElementById('portfolio-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  if (lightbox && lightboxImg && lightboxClose) {
    const portfolioImages = document.querySelectorAll('.portfolio-double-preview img');

    portfolioImages.forEach(img => {
      img.style.cursor = 'zoom-in';

      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        if (lightboxCaption) {
          lightboxCaption.textContent = img.alt || 'Portfolio screenshot';
        }
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        lightboxImg.src = '';
        if (lightboxCaption) lightboxCaption.textContent = '';
      }, 350);
    };

    lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) {
        closeLightbox();
      }
    });
  }

  // Final icon init after all dynamic content
  setTimeout(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, 100);
});

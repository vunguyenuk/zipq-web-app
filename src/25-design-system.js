/* Semantic enhancement layer for the SegmentUI-derived ZipQ interface. */
const DesignSystem = {
  enhance(app, key) {
    document.documentElement.dataset.textScale = S.session.textScale === 'comfortable' ? 'comfortable' : 'standard';
    const root = app.firstElementChild;
    if (!root) return;

    root.classList.add('estio-screen');
    root.dataset.screen = key;
    const main = $('main', root);
    // The ChatGPT-style product rail now precedes the contextual sidebar.
    // Select the direct aside instead of assuming it is always child one.
    const sidebar = $(':scope > aside', root) || $('aside', root);
    if (main) {
      main.id = 'main-content';
      main.classList.add('app-main');
      main.setAttribute('tabindex', '-1');
      if (main.firstElementChild && (/height:\s*60px/i.test(main.firstElementChild.getAttribute('style') || '') || /Search transactions, people, forms/.test(text(main.firstElementChild)))) {
        main.firstElementChild.classList.add('app-topbar');
      }
    }
    if (sidebar) sidebar.classList.add('app-sidebar');

    this.ensureSkipLink();
    this.accessibility(root);
    this.classifySections(root);
    this.classifyStatuses(root);
    this.screen(root, key);
    this.classifyPrimitives(root);
    this.classifyReadableText(root);
    this.classifyLayout(root, key);
  },

  classifyReadableText(root) {
    // Imported screens contain hundreds of one-off 10–13.5px inline labels.
    // Normalize actual text, not decorative wrappers or icon geometry.
    $$('[style*="font-size"], [style*="color"]', root).forEach((element) => {
      if (element.closest('[aria-hidden="true"]') || element.matches(':disabled, [aria-disabled="true"]')) return;
      if (![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return;
      const inline = element.getAttribute('style') || '';
      const size = /font-size:\s*(\d+(?:\.\d+)?)px/i.exec(inline);
      if (size && Number(size[1]) < 14) element.classList.add('readable-small-text');
      if (/color:\s*#(?:8f8f8f|94a3b8|9ca3af|a0a0a0|cbd5e1|64748b)\b/i.test(inline)) element.classList.add('readable-muted-text');
    });
  },

  ensureSkipLink() {
    if ($('.skip-link')) return;
    const link = html('<a class="skip-link" href="#main-content">Skip to main content</a>');
    document.body.insertBefore(link, document.body.firstChild);
  },

  accessibility(root) {
    const toastRoot = $('#toast-root');
    if (toastRoot) {
      toastRoot.setAttribute('role', 'status');
      toastRoot.setAttribute('aria-live', 'polite');
      toastRoot.setAttribute('aria-atomic', 'true');
    }

    $$('img', root).forEach((image) => {
      image.loading = image.closest('.home-brief-mark') ? 'eager' : 'lazy';
      if (!image.hasAttribute('alt')) image.alt = image.dataset.asset === '2141beaaf5' ? 'Sofia' : '';
    });

    $$('input, textarea, select', root).forEach((control) => {
      if (control.getAttribute('aria-label') || control.id || control.closest('label')) return;
      const field = control.closest('.field');
      const label = field && $('.flabel', field);
      control.setAttribute('aria-label', (label && text(label)) || control.placeholder || control.name || 'Input');
    });

    $$('[role=tablist]', root).forEach((list) => {
      const tabs = $$('a, button', list);
      tabs.forEach((tab) => {
        tab.setAttribute('role', 'tab');
        const selected = /background:\s*(#FFFFFF|rgb\(255,\s*255,\s*255\))|box-shadow:.*inset 0 -2px/i.test(tab.getAttribute('style') || '') || tab.getAttribute('aria-current') === 'page';
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      list.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = Math.max(0, tabs.indexOf(document.activeElement));
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next]?.focus();
      });
    });

    $$('[role=checkbox], [role=switch]', root).forEach((control) => {
      if (!/^(BUTTON|INPUT)$/.test(control.tagName)) control.tabIndex = 0;
      control.addEventListener('keydown', (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        control.click();
      });
    });
  },

  classifySections(root) {
    $$('section[aria-label], article', root).forEach((section) => section.classList.add('content-section'));
    $$('.row', root).forEach((row) => row.classList.add('interactive-row'));
    $$('.card', root).forEach((card) => card.classList.add('interactive-card'));
  },

  classifyStatuses(root) {
    $$('span, small', root).forEach((element) => {
      if (element.children.length) return;
      const value = text(element).trim().toLowerCase();
      if (!value || value.length > 36) return;
      if (/overdue|today 5 pm|due sun|contract deadline|no contact/.test(value)) element.dataset.tone = 'critical';
      else if (/blocked|waiting|draft|pending|needs confirmation/.test(value)) element.dataset.tone = 'warning';
      else if (/done|complete|connected|signed/.test(value)) element.dataset.tone = 'success';
      else if (/suggested|sofia/.test(value)) element.dataset.tone = 'sofia';
    });
  },

  /* Assign stable visual roles after the screen-specific hooks exist. This
     lets equivalent controls share one contract instead of inheriting the
     slightly different inline recipes in the imported screens. */
  classifyPrimitives(root) {
    $$('.btn', root).forEach((control) => {
      control.classList.add('ui-button');
      if (control.classList.contains('btn-sm')) control.classList.add('ui-button--compact');
      if (control.classList.contains('btn-primary')) control.classList.add('ui-button--primary');
    });
    $$('.icon-btn', root).forEach((control) => {
      if (!control.closest('.app-rail')) control.classList.add('ui-icon-button');
    });
    $$('.menu-i', root).forEach((control) => control.classList.add('ui-menu-item'));
    $$('.chip, .chip-b, .chip-link, .filter-chip', root).forEach((control) => {
      control.classList.add('ui-chip');
      if (control.matches('.filter-chip, .chip-b')) control.classList.add('ui-chip--filter');
    });

    $$('button, a', root).forEach((control) => {
      if (control.closest('.app-rail')) {
        control.classList.remove('ui-button', 'ui-icon-button');
        return;
      }
      if (control.matches('.nav, .subnav, .menu-i, .ui-chip, .app-rail-item, [role="tab"], [role="switch"], [role="checkbox"]')) return;
      const hasGraphic = !!control.querySelector('svg, img');
      const hasVisibleText = text(control).trim().length > 0;
      if (control.classList.contains('icon-btn') || (hasGraphic && !hasVisibleText && control.hasAttribute('aria-label'))) {
        control.classList.add('ui-icon-button');
        return;
      }
      const inlineStyle = control.getAttribute('style') || '';
      // Typography is independent of button geometry: a 44px touch target
      // should not inherit an oversized label from its imported screen.
      if (hasVisibleText && (control.tagName === 'BUTTON' || control.classList.contains('btn') ||
          control.classList.contains('sidebar-primary-action') || /height:\s*(?:36|38|40|42|44|46|48)px/i.test(inlineStyle))) {
        control.classList.add('ui-action-label');
      }
      if (control.classList.contains('btn') || /height:\s*(?:36|38|40|42)px/i.test(inlineStyle)) {
        control.classList.add('ui-button');
      }
    });

    $$('.card', root).forEach((card) => card.classList.add('ui-card'));
    $$('.settings-profile, .work-group', root).forEach((panel) => panel.classList.add('ui-panel'));
    $$('.settings-profile', root).forEach((panel) => panel.classList.add('ui-panel--padded'));

    $$('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea', root).forEach((control) => {
      const composer = control.closest('.chat-input-shell, .sofia-composer, .composer');
      const compact = control.closest('.toolbar-search, [role="search"], .quick-filter-bar') || /^search/i.test(control.getAttribute('aria-label') || control.placeholder || '');
      const inlineStyle = control.getAttribute('style') || '';
      const bare = composer || (/border:\s*0(?:px)?/i.test(inlineStyle) && control.parentElement?.matches('label, div, form'));
      control.classList.add(bare ? 'ui-input--bare' : 'ui-input');
      if (compact) control.classList.add('ui-input--compact');
      if (control.tagName === 'TEXTAREA') control.classList.add('ui-input--multiline');
    });

    $$('.page-title, .auth-title', root).forEach((heading) => heading.classList.add('type-page-title'));
    $$('main section > h2:first-child, main section > h3:first-child, main article > h2:first-child, main article > h3:first-child', root)
      .forEach((heading) => heading.classList.add('type-section-title'));
    $$('.flabel, .settings-profile label > span:first-child', root).forEach((label) => label.classList.add('type-label'));
    $$('.fhint, .modal-s, .menu-h, .settings-profile label > small', root).forEach((caption) => caption.classList.add('type-caption'));
  },

  /* Layout roles make alignment structural: page rails live on regions,
     vertical stacks stretch, rows center their controls, and data tables own
     their column grid instead of relying on screenshot-specific offsets. */
  classifyLayout(root, key) {
    const main = $('main', root);
    if (!main) return;

    main.classList.add('layout-root', 'layout-stack');
    const regions = [...main.children];
    regions.forEach((region) => region.classList.add('layout-region'));

    const addPadded = (...items) => items.filter(Boolean).forEach((item) => item.classList.add('layout-padded'));
    const addRail = (...items) => items.filter(Boolean).forEach((item) => item.classList.add('layout-rail'));

    if (/^agenda/.test(key)) {
      addPadded(regions[0]);
      if (key === 'agendaCalendar') {
        addRail($('.agenda-calendar-grid', main));
      } else addPadded(regions[1]);
    } else if (key === 'transactions' || /^tx/.test(key)) {
      addPadded(regions[0], regions[1]);
    } else if (key === 'forms') {
      addPadded(regions[0], regions[2]);
      addRail(regions[1]);
    } else if (/^(templates|templatePlaybook)$/.test(key)) {
      addPadded(regions[0], regions.at(-1));
      if (regions.length > 2) addRail(regions[1]);
    } else if (/^(settings|settingsSecurity|settingsNotifications|routines)$/.test(key)) {
      addPadded(regions[0]);
      regions[1]?.classList.add('settings-layout');
    } else if (/^(clients|clientsTable|followUps)$/.test(key)) {
      addPadded(regions[0], ...regions.slice(1));
    } else if (key === 'contacts') {
      addPadded(regions[0], regions[1]);
      addRail(regions[2], regions[3]);
      regions[2]?.classList.add('partner-context-note');
    }

    const verticalCandidates = [main, ...$$('main > *, main > * > section, main > * > article', root)];
    verticalCandidates.forEach((container) => {
      const style = getComputedStyle(container);
      if (style.display === 'flex' && style.flexDirection === 'column') container.classList.add('layout-stack');
    });

    $$('.row, .interactive-row, .panel-heading, .page-header-row, .section-heading', root).forEach((row) => {
      row.classList.add('layout-row');
      [...row.children].forEach((child) => {
        const style = getComputedStyle(child);
        if (style.display === 'flex' && style.flexDirection === 'column') child.classList.add('layout-text-group');
      });
    });

    $$('.transaction-table, .client-table, .contact-table, [role="table"]', root).forEach((table) => {
      table.classList.add('data-grid');
      [...table.children].forEach((row) => row.classList.add('data-grid-row'));
    });
  },

  screen(root, key) {
    const main = $('main', root);
    const title = main && $('h1', main);
    if (title) title.classList.add('page-title');

    if (key === 'home' || key === 'homeFirstWeek') this.home(root);
    if (key === 'chat') this.chat(root);
    if (key === 'transactions') this.transactions(root);
    if (/^tx/.test(key)) this.transaction(root, key);
    if (/^agenda/.test(key)) this.agenda(root);
    if (/^(clients|clientsTable|followUps|contacts)$/.test(key)) this.relationships(root, key);
    if (/^(forms|templates|templatePlaybook|formEditor|sendSignature)$/.test(key)) this.forms(root, key);
    if (/^(settings|settingsSecurity|settingsNotifications|routines)$/.test(key)) this.settings(root);
    if (/^(signin|signup|onb)/.test(key)) this.authentication(root);
  },

  home(root) {
    const main = $('main', root);
    const canvas = main && main.children[1];
    if (!canvas) return;
    const toolbar = main.firstElementChild;
    if (toolbar) {
      $$('button', toolbar).filter((button) => {
        const label = button.getAttribute('aria-label') || '';
        return /^(Global search|Search|Notifications)$/i.test(label.trim()) || /^Search$/i.test(button.title || '') || /Search transactions, people, forms/.test(text(button));
      }).forEach(hide);
    }
    canvas.classList.add('home-canvas');
    const heading = $('h1', canvas);
    const summary = heading && heading.nextElementSibling;
    if (summary) summary.classList.add('home-summary');

    const avatar = heading && heading.previousElementSibling;
    if (avatar) {
      avatar.classList.add('home-brief-mark');
      avatar.style.setProperty('display', 'none', 'important');
    }

    const composerInput = $('[aria-label="Message Sofia"]', canvas);
    const composer = composerInput && composerInput.parentElement;
    if (composerInput) composerInput.setAttribute('placeholder', 'Ask Sofia to handle a deadline or document. Type / for actions');
    if (composer) composer.classList.add('sofia-composer');
    if (composer && composer.nextElementSibling) {
      composer.nextElementSibling.classList.add('composer-hint');
      composer.nextElementSibling.textContent = 'AI agent can prepare forms, track deadlines, and assemble signature packets. You approve every saved or sent action.';
    }

    const firstChip = $('.chip', canvas);
    if (firstChip && firstChip.parentElement) firstChip.parentElement.classList.add('quick-actions');

    const work = $('section[aria-label="Today\'s Work Items"]', canvas) || $('section[aria-label="Get started"]', canvas);
    if (work) {
      work.classList.add('focus-workspace');
      if (work.children[0]) work.children[0].classList.add('section-heading');
      [work.children[0], ...$$('*', work.children[0])].forEach((element) => {
        if (/^today's work items$/i.test(text(element).trim()) && !element.children.length) element.textContent = 'Priority work';
      });
      if (work.children[1]) {
        work.children[1].classList.add('focus-grid');
        if (work.children[1].children[0]) work.children[1].children[0].classList.add('focus-primary');
        if (work.children[1].children[1]) work.children[1].children[1].classList.add('focus-rail');
      }
    }

    if ($('section[aria-label="Get started"]', canvas)) {
      const voiceAction = $$('a', canvas).find((link) => /^Create a transaction by voice$/i.test(text(link)));
      const actionList = voiceAction && voiceAction.parentElement;
      if (actionList) {
        actionList.classList.add('onboarding-action-list');
        [...actionList.children].forEach((action) => action.classList.add('onboarding-action'));
      }
    }
  },

  chat(root) {
    root.classList.add('chat-screen');
    const main = $('main', root);
    if (!main) return;
    main.classList.add('chat-main');
    const [header, scroller, composer] = main.children;
    if (header) header.classList.add('chat-header');
    if (scroller) {
      scroller.classList.add('chat-scroll');
      if (scroller.firstElementChild) scroller.firstElementChild.classList.add('chat-thread');
    }
    if (composer) {
      composer.classList.add('chat-composer-dock');
      const wrap = composer.firstElementChild;
      if (wrap) {
        wrap.classList.add('chat-composer-wrap');
        if (wrap.children[0]) wrap.children[0].classList.add('chat-suggestions');
        if (wrap.children[1]) wrap.children[1].classList.add('chat-input-shell');
      }
    }
    const input = $('textarea', composer || main);
    if (input) input.setAttribute('placeholder', 'Message Sofia about a deadline or document');
    const context = $('aside[aria-label="Transaction context"]', root);
    if (context) context.classList.add('chat-context');
  },

  transactions(root) {
    const main = $('main', root);
    const header = main && $('header', main);
    if (header) {
      header.classList.add('workspace-header');
      if (header.children[0]) header.children[0].classList.add('page-header-row');
      if (header.children[1]) header.children[1].classList.add('page-tabs');
      if (header.children[2]) header.children[2].classList.add('quick-filter-bar');
    }
    const search = $('input[aria-label="Search address or client"], input[aria-label="Search transactions"], input[placeholder="Search address or client"]', root);
    if (search && search.parentElement) search.parentElement.classList.add('toolbar-search');
    $$('button, a', header || root).forEach((control) => {
      const label = text(control);
      if (/^Sort:/.test(label)) control.classList.add('toolbar-sort');
      if (/^New transaction/.test(label)) control.classList.add('toolbar-primary');
    });
    if (main && main.children[1]) main.children[1].classList.add('workspace-body');
    if (main && main.lastElementChild) main.lastElementChild.classList.add('sofia-dock');
    const table = $('section[aria-label="Transactions"], section[aria-label="Current transactions"]', root);
    if (table) table.classList.add('transaction-table');
    $$('[data-tx]', root).forEach((row) => row.classList.add('transaction-row'));
  },

  transaction(root, key) {
    const main = $('main', root);
    if (main) main.classList.add('transaction-detail');
    const tabs = $('nav, [role=tablist]', main);
    if (tabs) tabs.classList.add('detail-tabs');

    /* The imported screens used several almost-identical inline header recipes.
       Give the real section headers one semantic hook so density is controlled
       by the system instead of by source-order accidents. */
    if (/^tx(Checklist|Documents)$/.test(key)) {
      $$('section', main).forEach((section) => {
        const heading = section.firstElementChild;
        if (!heading || !section.children[1]) return;
        if (/justify-content:\s*space-between/i.test(heading.getAttribute('style') || '')) heading.classList.add('panel-heading');
      });
    }
  },

  agenda(root) {
    const list = $('[aria-label="Agenda list"]', root);
    const rail = $('aside[aria-label="Today and suggestions"]', root);
    if (list) list.classList.add('agenda-list');
    if (rail) rail.classList.add('context-rail');
    $$('[data-txcard], [data-dyn]', list || root).forEach((card) => card.classList.add('work-group'));
  },

  relationships(root, key) {
    const list = $('[aria-label="Client list"], [aria-label="Follow-up list"]', root);
    if (list) list.classList.add('relationship-list');
    const table = $('[aria-label="Clients"][role="table"]', root);
    if (table) {
      table.classList.add('client-table');
      [...table.children].slice(1).forEach((row) => row.classList.add('client-row'));
    }
    if (key === 'contacts') {
      const header = $$('main > div > div', root).find((row) => row.children.length === 7 && text(row.children[0]) === 'Name' && text(row.children[1]) === 'Company');
      const contacts = header?.parentElement;
      if (contacts) {
        contacts.classList.add('contact-table');
        [...contacts.children].slice(1).forEach((row) => row.classList.add('contact-row'));
      }
    }
  },

  forms(root, key) {
    const main = $('main', root);
    if (main) main.classList.add('forms-workspace');
    if (key === 'forms') {
      const input = $('input[aria-label="Describe your situation for Sofia"]', main);
      const bar = input && input.closest('.composer');
      if (bar) bar.classList.add('forms-assist-bar');
    }
  },

  settings(root) {
    const main = $('main', root);
    if (main) main.classList.add('settings-workspace');
    const profile = $('section[aria-label="Profile"]', main);
    if (profile) profile.classList.add('settings-profile');
  },

  authentication(root) {
    root.classList.add('auth-screen');
    const title = $('h1', root);
    if (title) title.classList.add('auth-title');
  },
};

window.DesignSystem = DesignSystem;

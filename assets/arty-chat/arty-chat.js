/* ARTY · guía flotante y saludo hablado. Sin claves ni datos sensibles en el navegador. */
(function () {
  'use strict';

  if (window.__artyGuideLoaded) return;
  window.__artyGuideLoaded = true;

  var WA = 'https://wa.me/573202459032?text=' + encodeURIComponent('¡Hola! Quiero cotizar un evento con Artes y Entretenimiento.');
  var AVATAR = 'assets/arty/arty-badge.webp';

  var GREETING = '¡Hola! Qué gusto saludarte por acá. Soy Arty, Gestor de Experiencias en Artes y Entretenimiento. ¿Qué celebración tienes en mente?';
  var VOICE_GREETING = '¡Hola! Soy Arty, Gestor de Experiencias en Artes y Entretenimiento. Cuéntame, ¿qué celebración tienes en mente?';

  var ROUTES = {
    inicio: { label: 'Inicio', url: '/' },
    dj: { label: 'DJ en Bogotá', url: '/dj-bogota' },
    sonido: { label: 'Sonido profesional', url: '/sonido-eventos-bogota' },
    iluminacion: { label: 'Iluminación', url: '/iluminacion-eventos-bogota' },
    bodas: { label: 'Bodas', url: '/dj-bodas-bogota' },
    empresas: { label: 'Eventos empresariales', url: '/eventos-empresariales-bogota' },
    whatsapp: { label: 'Cotizar por WhatsApp', url: WA }
  };

  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var byPath = {
    '/': ['dj', 'sonido', 'iluminacion', 'bodas', 'empresas'],
    '/dj-bogota': ['sonido', 'iluminacion', 'bodas', 'whatsapp'],
    '/sonido-eventos-bogota': ['dj', 'iluminacion', 'empresas', 'whatsapp'],
    '/iluminacion-eventos-bogota': ['dj', 'sonido', 'bodas', 'whatsapp'],
    '/dj-bodas-bogota': ['iluminacion', 'sonido', 'dj', 'whatsapp'],
    '/eventos-empresariales-bogota': ['sonido', 'iluminacion', 'dj', 'whatsapp']
  };
  var DEFAULT_CHIPS = byPath[path] || ['inicio', 'dj', 'sonido', 'iluminacion', 'bodas', 'empresas'];

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'arty-launcher';
  launcher.setAttribute('aria-label', 'Abrir guía con Arty');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<img src="' + AVATAR + '" alt="" aria-hidden="true">';

  var hint = document.createElement('div');
  hint.className = 'arty-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.hidden = true;
  hint.textContent = '¡Hola! Soy Arty 👋';

  var panel = document.createElement('section');
  panel.className = 'arty-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Guía de Arty dentro del sitio');
  panel.innerHTML = [
    '<header class="arty-panel__head">',
    '<img class="arty-panel__avatar" src="', AVATAR, '" alt="">',
    '<div class="arty-panel__id"><strong>Arty</strong><span>Gestor de Experiencias</span></div>',
    '<button type="button" class="arty-panel__icon arty-js-voice" aria-label="Escuchar saludo de Arty" title="Escuchar saludo">🔊</button>',
    '<button type="button" class="arty-panel__icon arty-js-close" aria-label="Cerrar guía">×</button>',
    '</header>',
    '<div class="arty-panel__body arty-js-log" role="log" aria-live="polite"></div>',
    '<div class="arty-panel__chips arty-js-chips"></div>',
    '<form class="arty-panel__form arty-js-form">',
    '<input class="arty-panel__input arty-js-input" type="text" maxlength="180" autocomplete="off" placeholder="Cuéntame qué necesitas...">',
    '<button type="submit" class="arty-panel__send" aria-label="Enviar">➤</button>',
    '</form>',
    '<div class="arty-panel__foot"><a href="', WA, '" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp ↗</a></div>'
  ].join('');

  document.body.appendChild(hint);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  var log = panel.querySelector('.arty-js-log');
  var chipsBox = panel.querySelector('.arty-js-chips');
  var form = panel.querySelector('.arty-js-form');
  var input = panel.querySelector('.arty-js-input');
  var started = false;

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function addMessage(text, who) {
    var item = document.createElement('p');
    item.className = 'arty-msg arty-msg--' + (who === 'user' ? 'user' : 'arty');
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function renderChips(keys) {
    chipsBox.innerHTML = '';
    (keys || []).forEach(function (key) {
      var route = ROUTES[key];
      if (!route) return;
      var link = document.createElement('a');
      link.className = 'arty-chip';
      link.href = route.url;
      link.textContent = route.label;
      if (route.url === WA) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      chipsBox.appendChild(link);
    });
  }

  function replyFor(message) {
    var text = normalize(message);

    if (/quien eres|eres persona|eres una persona|eres humano|eres un bot/.test(text)) {
      return { text: '¡Hola! Estoy aquí para atenderte directamente y ayudarte con todo lo que necesites para tu evento.', chips: DEFAULT_CHIPS };
    }
    if (/hola|buenas|que tal|hey/.test(text)) {
      return { text: '¡Hola! Qué gusto saludarte por acá. Soy Arty, Gestor de Experiencias. ¿Qué celebración tienes en mente?', chips: DEFAULT_CHIPS };
    }
    if (/cuanto|precio|cotiz|valor|presupuesto/.test(text)) {
      return { text: '¡Claro que sí, con todo gusto! Para darte la info exacta, cuéntame: ¿para qué fecha y en qué ciudad o zona sería el evento?', chips: ['whatsapp', 'dj', 'sonido', 'iluminacion'] };
    }
    if (/disponibilidad|fecha|agenda|diciembre|puente/.test(text)) {
      return { text: 'Listo, de una. Para revisar eso con precisión, dime la fecha exacta o el puente festivo y la ciudad o zona del evento.', chips: ['whatsapp', 'bodas', 'empresas'] };
    }
    if (/boda|matrimonio|novios/.test(text)) {
      return { text: '¡Qué emoción! En bodas cuidamos cada detalle: sonido, iluminación cálida y el protocolo musical para que la pista nunca se pare. ¿Me cuentas la fecha y el lugar?', chips: ['bodas', 'iluminacion', 'whatsapp'] };
    }
    if (/iluminacion|luces|laser|led/.test(text)) {
      return { text: 'Con todo gusto. Para darte el montaje adecuado, cuéntame si es salón, hacienda o casa y cuántos invitados esperas.', chips: ['iluminacion', 'bodas', 'whatsapp'] };
    }
    if (/sonido|audio|microfono/.test(text)) {
      return { text: 'Listo, de eso nos encargamos. Dime si necesitas sonido para ceremonia, conferencia o pista, y te oriento mejor.', chips: ['sonido', 'empresas', 'whatsapp'] };
    }
    if (/empresa|corporativo|convencion|gala|btl/.test(text)) {
      return { text: '¡De una! Para eventos empresariales combinamos sonido cristalino para las charlas y una rumba de integración a la altura.', chips: ['empresas', 'sonido', 'whatsapp'] };
    }
    if (/dj|musica|show/.test(text)) {
      return { text: 'Claro que sí. Nuestro DJ lee la pista y arma el recorrido musical según tu celebración. ¿Qué fecha tienes en mente?', chips: ['dj', 'bodas', 'whatsapp'] };
    }
    if (/gracias|adios|hasta luego/.test(text)) {
      return { text: 'Cualquier cosa que necesites de camino a la fecha, aquí estaré a la orden. ¡Que tengas un excelente día!', chips: [] };
    }
    if (/whatsapp|hablar|asesor|agendar/.test(text)) {
      return { text: 'Listo, de una. Te dejo el enlace para que hablemos directamente y fijemos la fecha.', chips: ['whatsapp'] };
    }
    return { text: '¡Hola, qué tal! Cuéntame, ¿llegaste por algún servicio o evento en específico que tengas en mente?', chips: DEFAULT_CHIPS };
  }

  function openPanel() {
    panel.hidden = false;
    hint.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      addMessage(GREETING, 'arty');
      renderChips(DEFAULT_CHIPS);
    }
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  }

  launcher.addEventListener('click', function () {
    if (panel.hidden) openPanel(); else closePanel();
  });

  panel.querySelector('.arty-js-close').addEventListener('click', closePanel);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = input.value.trim();
    if (!value) return;
    addMessage(value, 'user');
    input.value = '';
    var answer = replyFor(value);
    window.setTimeout(function () {
      addMessage(answer.text, 'arty');
      renderChips(answer.chips);
    }, 220);
  });

  /* Voz: se elige la mejor opción española disponible y se ajusta a un tono juvenil y alegre. */
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices().filter(function (voice) {
      return /^es/i.test(voice.lang);
    });
    var preferredLangs = ['es-CO', 'es-419', 'es-MX', 'es-AR', 'es-ES'];
    for (var i = 0; i < preferredLangs.length; i += 1) {
      var byLang = voices.filter(function (voice) {
        return voice.lang.toLowerCase().replace('_', '-') === preferredLangs[i].toLowerCase();
      })[0];
      if (byLang) return byLang;
    }
    var preferredNames = ['helena', 'lucia', 'monica', 'paulina', 'elvira', 'google espanol', 'google español'];
    for (var j = 0; j < preferredNames.length; j += 1) {
      var byName = voices.filter(function (voice) {
        return voice.name.toLowerCase().indexOf(preferredNames[j]) !== -1;
      })[0];
      if (byName) return byName;
    }
    return voices[0] || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    var voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'es-CO';
    }
    utterance.rate = 1.06;
    utterance.pitch = 1.2;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  panel.querySelector('.arty-js-voice').addEventListener('click', function () {
    speak(VOICE_GREETING);
  });

  /* Los navegadores impiden reproducir audio automáticamente: el saludo suena tras el primer clic. */
  var voiceDone = false;
  function greetOnFirstInteraction() {
    if (voiceDone) return;
    voiceDone = true;
    try {
      if (window.sessionStorage.getItem('arty-voice') !== 'hecho') {
        window.sessionStorage.setItem('arty-voice', 'hecho');
        speak(VOICE_GREETING);
      }
    } catch (error) {
      /* Sin almacenamiento: se omite el guardado, el saludo igual se reproduce. */
    }
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (eventName) {
    document.addEventListener(eventName, greetOnFirstInteraction, { once: true, passive: true });
  });

  window.setTimeout(function () {
    if (panel.hidden) hint.hidden = false;
  }, 900);

  window.setTimeout(function () {
    hint.hidden = true;
  }, 9000);
})();

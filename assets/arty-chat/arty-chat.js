/* ARTY · guía flotante y saludo hablado. Sin claves ni datos sensibles en el navegador. */
(function () {
  'use strict';

  if (window.__artyGuideLoaded || document.getElementById('arty-guide-panel')) return;
  window.__artyGuideLoaded = true;

  var WA = 'https://wa.me/573202459032?text=' + encodeURIComponent('¡Hola! Quiero cotizar un evento con Artes y Entretenimiento.');
  var GOOGLE = 'https://share.google/Prz4WWHFgLRpAebrs';
  var AVATAR = 'assets/arty/arty-badge.webp';

  var GREETING = '¡Hola, hola! Qué gusto saludarte por acá 😄 Soy Arty, Gestor de Experiencias en Artes y Entretenimiento. ¿Qué celebración tienes en mente?';
  var VOICE_GREETING = '¡Hola, hola! Soy Arty, Gestor de Experiencias en Artes y Entretenimiento. Cuéntame, ¿qué celebración tienes en mente?';

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
  launcher.id = 'arty-guide-launcher';
  launcher.className = 'arty-launcher';
  launcher.setAttribute('aria-label', 'Abrir guía con Arty');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<img src="' + AVATAR + '" alt="" aria-hidden="true">';

  var hint = document.createElement('div');
  hint.id = 'arty-guide-hint';
  hint.className = 'arty-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.hidden = true;
  hint.textContent = '¡Hola! Soy Arty 👋';

  var panel = document.createElement('section');
  panel.id = 'arty-guide-panel';
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
    '<div class="arty-panel__lead">',
    '<span class="arty-panel__lead-label">Tus datos para la cotización</span>',
    '<input class="arty-panel__field arty-js-name" type="text" maxlength="60" placeholder="Tu nombre" autocomplete="name" aria-label="Tu nombre">',
    '<select class="arty-panel__field arty-js-event" aria-label="Tipo de evento">',
    '<option value="">Tipo de evento</option>',
    '<option value="Boda">Boda</option>',
    '<option value="Quince años">Quince años</option>',
    '<option value="Cumpleaños">Cumpleaños</option>',
    '<option value="Evento empresarial">Evento empresarial</option>',
    '<option value="Otro">Otro</option>',
    '</select>',
    '<select class="arty-panel__field arty-js-service" aria-label="Servicio requerido">',
    '<option value="">Servicio requerido</option>',
    '<option value="DJ">DJ</option>',
    '<option value="Sonido">Sonido</option>',
    '<option value="Iluminación">Iluminación</option>',
    '<option value="DJ + sonido + iluminación">DJ + sonido + iluminación</option>',
    '<option value="Aún no estoy seguro">Aún no estoy seguro</option>',
    '</select>',
    '<input class="arty-panel__field arty-js-date" type="text" maxlength="80" placeholder="Fecha y ciudad (opcional)" aria-label="Fecha y ciudad (opcional)">',
    '<input id="arty-phone" class="arty-panel__field arty-js-phone" type="tel" inputmode="numeric" placeholder="WhatsApp (10 dígitos)" autocomplete="tel" aria-label="Número de WhatsApp" maxlength="12">',
    '</div>',
    '<div class="arty-panel__submit">',
    '<button type="button" class="arty-panel__summary arty-js-summary">Enviar cotización por WhatsApp</button>',
    '<small class="arty-panel__consent">Usamos tus datos para enviarte la cotización y darte atención personalizada.</small>',
    '</div>',
    '<div class="arty-panel__foot">',
    '<a href="', WA, '" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp ↗</a>',
    ' · ',
    '<a href="', GOOGLE, '" target="_blank" rel="noopener noreferrer">Ver en Google ↗</a>',
    '</div>'
  ].join('');

  document.body.appendChild(hint);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  var log = panel.querySelector('.arty-js-log');
  var chipsBox = panel.querySelector('.arty-js-chips');
  var form = panel.querySelector('.arty-js-form');
  var input = panel.querySelector('.arty-js-input');
  var nameInput = panel.querySelector('.arty-js-name');
  var eventInput = panel.querySelector('.arty-js-event');
  var serviceInput = panel.querySelector('.arty-js-service');
  var dateInput = panel.querySelector('.arty-js-date');
  var phoneInput = panel.querySelector('.arty-js-phone');
  var summaryButton = panel.querySelector('.arty-js-summary');
  var transcript = [];
  var started = false;
  var navigating = false;

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function goTo(url) {
    if (navigating) return;
    navigating = true;
    window.location.href = url;
  }

  function addMessage(text, who, alreadySpoken) {
    var item = document.createElement('p');
    item.className = 'arty-msg arty-msg--' + (who === 'user' ? 'user' : 'arty');
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
    transcript.push({ who: who, text: text, at: new Date().toISOString() });
    if (who !== 'user' && !alreadySpoken) speakOnce(text);
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
      link.addEventListener('click', function (event) {
        if (route.url === WA) {
          speakOnce('Listo, de una. Te dejo el enlace para cotizar por WhatsApp.');
          return;
        }
        event.preventDefault();
        var answer = replyFor(route.label);
        addMessage(route.label, 'user');
        addMessage(answer.text, 'arty', true);
        renderChips(answer.chips);
        speakThen(answer.text, function () {
          goTo(route.url);
        });
      });
      chipsBox.appendChild(link);
    });
  }

  function replyFor(message) {
    var text = normalize(message);

    if (/quien eres|eres persona|eres una persona|eres humano|eres un bot/.test(text)) {
      return { text: '¡Hola! Estoy aquí para atenderte directamente y ayudarte con todo lo que necesites para tu evento. ¿Qué celebración tienes en mente?', chips: DEFAULT_CHIPS };
    }
    if (/hola|buenas|que tal|hey/.test(text)) {
      return { text: '¡Hola, hola! ¿Qué gusto saludarte por acá 😄 Soy Arty, Gestor de Experiencias en Artes y Entretenimiento. ¿Cómo va todo por allá?', chips: DEFAULT_CHIPS };
    }
    if (/cuanto|precio|cotiz|valor|presupuesto/.test(text)) {
      return { text: '¡Uy, con todo gusto! Para darte la info exacta, cuéntame: ¿para qué fecha y en qué ciudad o zona sería el evento?', chips: ['whatsapp', 'dj', 'sonido', 'iluminacion'] };
    }
    if (/disponibilidad|fecha|agenda|diciembre|puente/.test(text)) {
      return { text: '¡Listo, de una! Para revisar eso con precisión, dime la fecha exacta o el puente festivo y la ciudad o zona del evento.', chips: ['whatsapp', 'bodas', 'empresas'] };
    }
    if (/boda|matrimonio|novios/.test(text)) {
      return { text: '¡Ay, qué nota! En bodas cuidamos cada detalle: sonido, iluminación cálida y el protocolo musical para que la pista nunca se pare. ¿Me cuentas la fecha y el lugar?', chips: ['bodas', 'iluminacion', 'whatsapp'] };
    }
    if (/iluminacion|luces|laser|led/.test(text)) {
      return { text: '¡De una! Para darte el montaje adecuado, cuéntame si es salón, hacienda o casa y cuántos invitados esperas.', chips: ['iluminacion', 'bodas', 'whatsapp'] };
    }
    if (/sonido|audio|microfono/.test(text)) {
      return { text: '¡Listo! Tranquilo, de eso nos encargamos. Dime si necesitas sonido para ceremonia, conferencia o pista, y te oriento mejor.', chips: ['sonido', 'empresas', 'whatsapp'] };
    }
    if (/empresa|corporativo|convencion|gala|btl/.test(text)) {
      return { text: '¡De una! Para eventos empresariales combinamos sonido cristalino para las charlas y una rumba de integración a la altura.', chips: ['empresas', 'sonido', 'whatsapp'] };
    }
    if (/dj|musica|show/.test(text)) {
      return { text: '¡Claro que sí! Nuestro DJ lee la pista y arma el recorrido musical según tu celebración. ¿Qué fecha tienes en mente?', chips: ['dj', 'bodas', 'whatsapp'] };
    }
    if (/gracias|adios|hasta luego/.test(text)) {
      return { text: '¡Con todo gusto! Cualquier cosa que necesites de camino a la fecha, aquí estaré a la orden. ¡Que tengas un excelente día!', chips: [] };
    }
    if (/whatsapp|hablar|asesor|agendar/.test(text)) {
      return { text: '¡Listo, de una! Te dejo el enlace para que hablemos directamente y fijemos la fecha.', chips: ['whatsapp'] };
    }
    return { text: '¡Hola, qué más! Cuéntame, ¿llegaste por algún servicio o evento en específico que tengas en mente?', chips: DEFAULT_CHIPS };
  }

  function openPanel(focusInput) {
    panel.hidden = false;
    hint.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      addMessage(GREETING, 'arty', true);
      renderChips(DEFAULT_CHIPS);
    }
    if (focusInput !== false) input.focus();
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

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  /* Acepta el número pegado con espacios o con +57 y lo deja en 10 dígitos. */
  function normalizePhone(value) {
    var digits = onlyDigits(value);
    if (digits.length === 12 && digits.indexOf('57') === 0) digits = digits.slice(2);
    return digits;
  }

  phoneInput.addEventListener('input', function () {
    var digits = onlyDigits(phoneInput.value).slice(0, 12);
    if (phoneInput.value !== digits) phoneInput.value = digits;
  });

  summaryButton.addEventListener('click', function () {
    var name = String(nameInput.value || '').replace(/\s+/g, ' ').trim();
    var eventType = eventInput.value;
    var service = serviceInput.value;
    var details = String(dateInput.value || '').replace(/\s+/g, ' ').trim();
    var phone = normalizePhone(phoneInput.value);

    if (!name) {
      addMessage('¡De una! Primero dinos tu nombre para poder atenderte como mereces. 😊', 'arty');
      nameInput.focus();
      return;
    }
    if (!eventType) {
      addMessage('¡Listo! Falta el tipo de evento: ¿es boda, quince años, cumpleaños o empresarial?', 'arty');
      eventInput.focus();
      return;
    }
    if (!service) {
      addMessage('¡Uy! Nos falta el servicio que necesitas: DJ, sonido, iluminación o los tres. 👇', 'arty');
      serviceInput.focus();
      return;
    }
    if (!/^3\d{9}$/.test(phone)) {
      addMessage('¡Uy! Escribe un número móvil colombiano de 10 dígitos, por ejemplo 3001234567.', 'arty');
      phoneInput.focus();
      return;
    }

    var recent = transcript.slice(-12);
    var lines = recent.map(function (entry) {
      return (entry.who === 'user' ? 'Cliente' : 'Arty') + ': ' + entry.text;
    });
    var message = [
      '¡Hola, hola! 👋 Soy ' + name + '.',
      '',
      'Quiero cotizar mi evento y me gustaría recibir atención personalizada de parte de Arty.',
      '',
      'Mis datos:',
      '• Nombre: ' + name,
      '• Tipo de evento: ' + eventType,
      '• Servicio requerido: ' + service,
      '• Fecha y ciudad: ' + (details || 'Por confirmar contigo'),
      '• WhatsApp: +57 ' + phone,
      '',
      'Contexto de lo que conversamos en la web:',
      lines.join('\n')
    ].join('\n');
    var url = 'https://wa.me/573202459032?text=' + encodeURIComponent(message);

    var link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addMessage('¡Listo! Se abrió WhatsApp con tu cotización y atención personalizada. Envíalo y te atendemos de una. 🙌', 'arty');
  });

  /* Voz: hombre joven, alegre y expresivo. Se prefieren voces masculinas del dispositivo. */
  var MALE_VOICE_NAMES = [
    'jorge', 'diego', 'pablo', 'bernardo', 'hector', 'héctor', 'raul', 'raúl',
    'gustavo', 'juan', 'fernando', 'alejandro', 'daniel', 'sebastian', 'sebastián',
    'tomás', 'tomas', 'emiliano', 'santiago', 'mateo', 'andres', 'andrés', 'camilo',
    'julian', 'julián', 'javier', 'ruben', 'rubén', 'marco', 'antonio', 'alberto',
    'carlos', 'luis', 'oscar', 'óscar', 'ivan', 'iván', 'hombre', 'masculino', 'male'
  ];
  var NATURAL_VOICE_HINTS = ['natural', 'neural', 'premium', 'online', 'google'];

  function pickVoice() {
    if (!('speechSynthesis' in window)) return { voice: null, male: false, natural: false, forced: false };
    var voices = window.speechSynthesis.getVoices().filter(function (voice) {
      return /^es/i.test(voice.lang);
    });

    var maleVoices = voices.filter(function (voice) {
      var name = voice.name.toLowerCase();
      return MALE_VOICE_NAMES.some(function (candidate) {
        return name.indexOf(candidate) !== -1;
      });
    });

    var naturalMale = maleVoices.filter(function (voice) {
      var name = voice.name.toLowerCase();
      return NATURAL_VOICE_HINTS.some(function (hint) {
        return name.indexOf(hint) !== -1;
      });
    })[0];
    if (naturalMale) return { voice: naturalMale, male: true, natural: true, forced: false };
    if (maleVoices[0]) return { voice: maleVoices[0], male: true, natural: false, forced: false };

    var preferredLangs = ['es-MX', 'es-CO', 'es-419', 'es-AR', 'es-ES'];
    for (var i = 0; i < preferredLangs.length; i += 1) {
      var byLang = voices.filter(function (voice) {
        return voice.lang.toLowerCase().replace('_', '-') === preferredLangs[i].toLowerCase();
      })[0];
      if (byLang) return { voice: byLang, male: false, natural: false, forced: true };
    }
    return { voice: voices[0] || null, male: false, natural: false, forced: true };
  }

  function splitExpressive(text) {
    var parts = String(text).match(/[^.!?]+[.!?]+/g) || [String(text)];
    return parts.map(function (part) {
      return part.trim();
    }).filter(Boolean);
  }

  function speak(text, onDone) {
    if (!('speechSynthesis' in window)) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    window.speechSynthesis.cancel();

    var selection = pickVoice();
    var segments = /^¡/.test(String(text)) ? splitExpressive(text) : [text];
    var index = 0;

    function finish() {
      if (typeof onDone === 'function') onDone();
    }

    function next() {
      if (index >= segments.length) {
        finish();
        return;
      }

      var utterance = new SpeechSynthesisUtterance(segments[index]);
      var voice = selection.voice;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'es-MX';
      }

      /* Modulación suave: se evitan los saltos bruscos de tono que suenan a máquina.
         Si no hay voz masculina, se baja el tono para acercarse al registro pedido. */
      if (selection.male) {
        utterance.pitch = index === 0 ? 1.1 : 1.06;
        utterance.rate = index === 0 ? 1.06 : 1.02;
      } else if (selection.forced) {
        utterance.pitch = index === 0 ? 0.92 : 0.88;
        utterance.rate = 1;
      } else {
        utterance.pitch = index === 0 ? 1.04 : 1;
        utterance.rate = 1.02;
      }
      utterance.volume = 1;

      index += 1;
      var advance = function () {
        window.setTimeout(next, 140);
      };
      utterance.onend = advance;
      utterance.onerror = advance;
      window.speechSynthesis.speak(utterance);
    }

    next();
  }

  var lastSpoken = { text: '', at: 0 };

  function speakOnce(text, onDone) {
    var now = Date.now();
    if (lastSpoken.text === text && now - lastSpoken.at < 1200) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    lastSpoken = { text: text, at: now };
    speak(text, onDone);
  }

  /* Arty lee la respuesta y solo entonces lleva al usuario a la sección elegida. */
  function speakThen(text, callback) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      callback();
    }
    speakOnce(text, finish);
    window.setTimeout(finish, 8000);
  }

  panel.querySelector('.arty-js-voice').addEventListener('click', function () {
    speakOnce(VOICE_GREETING);
  });

  /* Los navegadores impiden reproducir audio automáticamente: el saludo suena tras el primer clic. */
  var voiceDone = false;
  function greetOnFirstInteraction() {
    if (voiceDone) return;
    voiceDone = true;
    try {
      if (window.sessionStorage.getItem('arty-voice') !== 'hecho') {
        window.sessionStorage.setItem('arty-voice', 'hecho');
        speakOnce(VOICE_GREETING);
      }
    } catch (error) {
      /* Sin almacenamiento: se omite el guardado, el saludo igual se reproduce. */
    }
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (eventName) {
    document.addEventListener(eventName, greetOnFirstInteraction, { once: true, passive: true });
  });

  /* El chat no se abre solo: queda el globo de saludo y el botón flotante. */
  window.setTimeout(function () {
    if (panel.hidden) hint.hidden = false;
  }, 900);

  window.setTimeout(function () {
    hint.hidden = true;
  }, 9000);
})();

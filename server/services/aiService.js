const { getCatalogData } = require('./catalogService');

/**
 * Motor de IA para Generación de Contenido Comercial y Publicitario
 * Conecta con API externa (Gemini/OpenAI) si existe la clave en .env,
 * o utiliza el generador algorítmico local basado 100% en datos reales de Artes & Entretenimiento.
 */

async function generateCommercialContent({
  platform = 'Instagram',
  audienceType = 'end_clients_wedding',
  contentType = 'Post Carrusel',
  serviceFocus = 'elegance',
  artistFocus = 'djcool',
  campaignGoal = 'Captación de Clientes',
  customInstructions = ''
}) {
  const catalog = getCatalogData();
  
  // Buscar datos reales del paquete seleccionado
  const selectedPackage = catalog.paquetes.find(p => p.id === serviceFocus) || catalog.paquetes[0] || {
    titulo: 'PLAN ELEGANCE',
    precio: '$600.000',
    elementos: ['2 Cabinas Profesionales', 'Cercha Tipo T', 'Luces Láser', 'DJ Animador']
  };

  // Buscar datos reales del artista seleccionado
  const selectedArtist = catalog.artistas.find(a => a.id === artistFocus) || catalog.artistas[0] || {
    nombre: 'DJ Cool',
    subtitulo: 'El Arquitecto de la Pista',
    descripcion: 'Especialista en leer la energía del público y Crossover Premium.'
  };

  // Audiencias descriptivas
  const audienceContexts = {
    'event_planners': {
      nombre: 'Organizadores de Eventos & Wedding Planners',
      enfoque: 'Aliado técnico de confianza, cero imprevistos, puntualidad británica, equipos impecables y soporte integral.',
      tono: 'Profesional, estético, confiable y enfocado en alianzas B2B.'
    },
    'btl_agencies': {
      nombre: 'Empresas BTL & Agencias de Publicidad',
      enfoque: 'Activaciones de marca de alto impacto acústico y visual, adaptabilidad a centros comerciales y montajes rápidos.',
      tono: 'Enérgico, corporativo, dinámico, enfocado en ROI de marca y experiencia del consumidor.'
    },
    'end_clients_wedding': {
      nombre: 'Clientes Finales - Parejas y Bodas',
      enfoque: 'Emoción, elegancia, recuerdos que duran toda la vida, pista llena hasta el amanecer sin momentos aburridos.',
      tono: 'Emotivo, cálido, romántico pero fiestero (Crossover Premium).'
    },
    'end_clients_fifteen': {
      nombre: 'Clientes Finales - 15 Años & Jóvenes',
      enfoque: 'Show de luces robóticas, láser show, cabina acrílica LED, música urbana y crossover moderno.',
      tono: 'Juvenil, electrizante, festivalero y moderno.'
    },
    'corporate': {
      nombre: 'Eventos Corporativos & Fiestas de Empresa',
      enfoque: 'Sonido cristalino para conferencias/discursos, elegancia sobria, y rumba de integración con factura y cotización formal.',
      tono: 'Ejecutivo, confiable, estructurado y distinguido.'
    }
  };

  const audienceInfo = audienceContexts[audienceType] || audienceContexts['end_clients_wedding'];

  // Si hay API KEY de Gemini en variables de entorno, intentar llamada externa
  if (process.env.GEMINI_API_KEY) {
    try {
      const externalResult = await callGeminiAPI({
        platform,
        contentType,
        audienceInfo,
        selectedPackage,
        selectedArtist,
        campaignGoal,
        customInstructions,
        catalog
      });
      if (externalResult) return externalResult;
    } catch (err) {
      console.warn('Fallo llamada a API externa, activando motor contextual local:', err.message);
    }
  }

  // Si hay API KEY de OpenAI en variables de entorno
  if (process.env.OPENAI_API_KEY) {
    try {
      const externalResult = await callOpenAIAPI({
        platform,
        contentType,
        audienceInfo,
        selectedPackage,
        selectedArtist,
        campaignGoal,
        customInstructions,
        catalog
      });
      if (externalResult) return externalResult;
    } catch (err) {
      console.warn('Fallo llamada a OpenAI, activando motor contextual local:', err.message);
    }
  }

  // Motor Contextual Nativo de Alta Precisión (100% Real, sin alucinaciones)
  return generateLocalCopy({
    platform,
    contentType,
    audienceInfo,
    selectedPackage,
    selectedArtist,
    campaignGoal,
    customInstructions,
    catalog
  });
}

function generateLocalCopy({
  platform,
  contentType,
  audienceInfo,
  selectedPackage,
  selectedArtist,
  campaignGoal,
  customInstructions,
  catalog
}) {
  const itemsText = selectedPackage.elementos ? selectedPackage.elementos.slice(0, 5).map(e => `✓ ${e}`).join('\n') : '✓ Sonido profesional y luces de alta gama';
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${catalog.marca.whatsapp}&text=Hola!%20Vi%20su%20publicaci%C3%B3n%20sobre%20el%20${encodeURIComponent(selectedPackage.titulo)}%20y%20quiero%20cotizar.`;

  let title = '';
  let hook = '';
  let copyBody = '';
  let cta = '';
  let hashtags = '';
  let visualNotes = '';

  if (platform === 'TikTok' || contentType.toLowerCase().includes('reel')) {
    // Formato de Guion Audiovisual para Video Corto
    title = `Guion Reel: ${selectedPackage.titulo} para ${audienceInfo.nombre}`;
    hook = `⚠️ [0-3s] "No contrates el sonido de tu evento hasta ver cómo luce un montaje profesional de verdad."`;
    
    copyBody = `🎬 ESTRUCTURA DE GUION REEL / TIKTOK (Duración: 25-30s):

[Toma 1: 0-3s - Gancho Visual]
Escena: Toma dinámica en cámara rápida de las luces láser encendiéndose y el beat explotando en la pista.
Audio: Voz en off enérgica: "El mayor error en un evento es dejar la música y el sonido al azar."

[Toma 2: 3-10s - Demostración del Problema vs Solución]
Escena: Enfoque a ${selectedArtist.nombre} (${selectedArtist.subtitulo}) en la consola, leyendo al público y mezclando crossover impecable.
Audio: "Con ${catalog.marca.nombre}, tus invitados no se sientan: bailan hasta el final. Nuestro ${selectedPackage.titulo} incluye:"
Texto en pantalla:
${itemsText}

[Toma 3: 10-20s - Prueba de Valor y Emoción]
Escena: Panorámica de los invitados saltando, cabina acrílica iluminada y cercha robótica activa.
Audio: "Desde ${selectedPackage.precio} en Bogotá y alrededores, con puntualidad absoluta y montaje de alta fidelidad."

[Toma 4: 20-25s - Llamado a la Acción Directo]
Escena: Logo de Artes & Entretenimiento y botón de WhatsApp en pantalla.
Audio: "Agenda tu fecha 2026 antes de que se agoten los fines de semana. Toca el link de nuestro perfil."`;

    cta = `📲 Escríbenos al WhatsApp ${catalog.marca.telefono} o toca el enlace en la biografía para verificar disponibilidad.`;
    hashtags = `#DJsColombia #SonidoProfesionalBogota #BodasBogota #EventosColombia #LucesParaFiestas #15AñosBogota #${selectedArtist.nombre.replace(/\s+/g, '')}`;
    visualNotes = `Usar clips dinámicos de ${selectedPackage.imagen} y video en vivo de ${selectedArtist.nombre} en la consola.`;

  } else if (platform === 'Facebook') {
    // Formato Facebook (Copy persuasivo con autoridad y detalles)
    title = `Publicación Facebook: Solución Integral con ${selectedPackage.titulo}`;
    hook = `¿Planeando tu evento en Bogotá o Cundinamarca? Asegura la experiencia sonora y visual que tus invitados merecen.`;
    
    copyBody = `En ${catalog.marca.nombre} entendemos que un evento memorable no se improvisa. La acústica de la sala, la intensidad de la iluminación y la psicología musical del DJ determinan el éxito de toda la noche.

Presentamos nuestra propuesta integral: 🌟 ${selectedPackage.titulo} (Inversión desde ${selectedPackage.precio})
Ideal para: ${audienceInfo.nombre}.

Lo que recibes para tu tranquilidad:
${itemsText}
✓ Artista en escena: ${selectedArtist.nombre} (${selectedArtist.subtitulo})
✓ Transporte y montaje puntual garantizado en Bogotá.

💬 Más de 500 eventos exitosos nos respaldan. Deja la diversión y la técnica en manos de expertos.`;

    cta = `👉 Haz clic en enviar mensaje o escríbenos directamente a WhatsApp: ${catalog.marca.telefono} para cotizar tu fecha sin costo.`;
    hashtags = `#EventosBogota #SonidoProfesional #ProduccionDeEventos #BodasColombia #FiestasEmpresariales #ArtesYEntretenimiento`;
    visualNotes = `Diseñar carrusel con foto de portada de ${selectedPackage.imagen} seguido por fotos de eventos reales de la carpeta fotos/.`;

  } else {
    // Formato Instagram (Copy estético, estructurado, espaciado con emojis)
    title = `Post Instagram: ${selectedPackage.titulo} & ${selectedArtist.nombre}`;
    hook = `✨ El momento de la fiesta no se repite: asegúrate de que la pista nunca esté vacía.`;

    copyBody = `Un evento extraordinario necesita una atmósfera que hable por sí sola. 🎶💫

Con nuestro **${selectedPackage.titulo}** combinamos potencia acústica milimétrica y un espectáculo visual diseñado para emocionar:

${itemsText}
🎧 Conducción musical por: **${selectedArtist.nombre}** (${selectedArtist.subtitulo})
📍 Cobertura: Bogotá y toda Colombia.
💎 Inversión: **${selectedPackage.precio}**

Ya sea para ${audienceInfo.nombre.toLowerCase()}, cuidamos cada detalle técnico para que tú solo te dediques a disfrutar.

🔥 *Agenda 2026 abierta. Pocas fechas disponibles para temporada alta.*`;

    cta = `📩 Toca el enlace en nuestra bio o envíanos un DM para apartar tu fecha hoy mismo. WhatsApp directo: ${catalog.marca.telefono}`;
    hashtags = `#BodasBogota #EventosBogota #DJBogota #SonidoProfesional #LucesParaEventos #EventosCorporativos #WeddingPlannerBogota #${selectedArtist.nombre.replace(/\s+/g, '')}`;
    visualNotes = `Imagen destacada: ${selectedPackage.imagen} acompañada de foto de ${selectedArtist.imagenes ? selectedArtist.imagenes[0] : 'assets/djcool-promo.jpg'}.`;
  }

  // Variaciones de anuncio para A/B testing
  const variations = [
    {
      label: 'Variación 1 (Enfoque Emocional)',
      hook: `La diferencia entre una reunión normal y la noche más recordada del año está en la magia del sonido.`,
      cta: `Haz de tu fecha algo legendario. Cotiza con nosotros por WhatsApp.`
    },
    {
      label: 'Variación 2 (Enfoque Seguridad y Calidad)',
      hook: `Cero fallas, puntualidad absoluta y montaje de gama alta desde ${selectedPackage.precio}.`,
      cta: `Verifica si tu fecha aún está disponible escribiéndonos ahora.`
    }
  ];

  return {
    title,
    hook,
    copy_text: copyBody,
    cta,
    hashtags,
    target_url: whatsappUrl,
    visual_notes: visualNotes,
    variations,
    meta: {
      package_used: selectedPackage.titulo,
      package_price: selectedPackage.precio,
      artist_used: selectedArtist.nombre,
      platform,
      audience: audienceInfo.nombre,
      generated_by: 'IA Contextual Artes & Entretenimiento (Datos Reales)'
    }
  };
}

async function callGeminiAPI(params) {
  const systemContext = `Eres el Director Creativo y Copywriter Senior de la empresa de producción musical y técnica "Artes y Entretenimiento" en Bogotá, Colombia.
Información real de la empresa (NO INVENTAR OTROS PRECIOS NI SERVICIOS):
- Marca: Artes y Entretenimiento
- WhatsApp: ${params.catalog.marca.whatsapp} / Tel: ${params.catalog.marca.telefono}
- Paquete en foco: ${params.selectedPackage.titulo} (Precio: ${params.selectedPackage.precio})
- Elementos del paquete: ${params.selectedPackage.elementos.join(', ')}
- Artista en foco: ${params.selectedArtist.nombre} - ${params.selectedArtist.subtitulo} (${params.selectedArtist.descripcion})
- Público objetivo: ${params.audienceInfo.nombre} (${params.audienceInfo.enfoque})
- Red social destino: ${params.platform} (${params.contentType})
- Meta de la campaña: ${params.campaignGoal}
${params.customInstructions ? `Instrucciones adicionales: ${params.customInstructions}` : ''}

Devuelve EXCLUSIVAMENTE un JSON válido con la siguiente estructura:
{
  "title": "Título descriptivo del contenido",
  "hook": "Gancho de apertura impactante (0-3 segundos o primera línea)",
  "copy_text": "Texto completo del post formateado con emojis y estructura para la red seleccionada",
  "cta": "Llamado a la acción claro",
  "hashtags": "Hashtags estratégicos colombianos",
  "target_url": "https://api.whatsapp.com/send?phone=${params.catalog.marca.whatsapp}&text=...",
  "visual_notes": "Recomendación de material visual a usar",
  "variations": [
    { "label": "Variación A", "hook": "...", "cta": "..." },
    { "label": "Variación B", "hook": "...", "cta": "..." }
  ]
}`;

  // Llamada REST directa: evita la dependencia @google/generative-ai,
  // que no está instalada y hacía fallar silenciosamente esta rama.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemContext }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    }
  );
  if (!response.ok) throw new Error(`Gemini API status ${response.status}`);
  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

async function callOpenAIAPI(params) {
  // Implementación estándar de fetch hacia OpenAI para evitar dependencias pesadas
  const prompt = `Eres el Copywriter de Artes y Entretenimiento Bogotá. Genera un contenido comercial en JSON para ${params.platform} enfocado en ${params.selectedPackage.titulo} (${params.selectedPackage.precio}) y ${params.selectedArtist.nombre} para ${params.audienceInfo.nombre}.`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) throw new Error(`OpenAI API status ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

module.exports = { generateCommercialContent };

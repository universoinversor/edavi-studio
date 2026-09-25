// Banco de prompts original de EDAVI para video y transformación, más consejos
// por familia de modelos. Los prompts van en inglés porque los modelos de video
// rinden mejor así; títulos y categorías en español.
//
// Campos opcionales:
//   params  → valores que se aplican si el modelo los admite (formato, cámara, duración…)
//   shots   → storyboard de varias tomas (Kling 3.0 / O3 con «Varias tomas»)
//   best    → familias donde mejor funciona (se destacan en la biblioteca)

export const VIDEO_CATEGORIES = ['Cine', 'Producto y anuncios', 'Moda y retrato', 'Naturaleza y viajes', 'Acción y deporte', 'Fantasía y VFX', 'Comida', 'Redes sociales', 'Arquitectura', 'Animación'];

export const VIDEO_PROMPTS = [
  // ---------- Cine ----------
  { category: 'Cine', title: 'Neo-noir bajo la lluvia', best: ['cinema-studio-4', 'kling-3'], params: { aspect_ratio: '21:9', genre: 'noir', light: 'practicals', camera_movement: 'dolly-in' },
    prompt: 'A detective in a soaked trench coat stands under a flickering neon sign in a rain-slick alley at night, cigarette smoke curling into violet light, slow dolly-in to a tight close-up of his eyes, reflections shimmering in puddles, anamorphic lens flares, moody low-key lighting, film grain.' },
  { category: 'Cine', title: 'Plano secuencia en el mercado', best: ['seedance-2-5', 'kling-3'],
    prompt: 'Single continuous handheld shot following a young woman weaving through a crowded night market in Bangkok, steam rising from food stalls, string lights overhead, vendors calling out, the camera slips between shoulders and stays close behind her, natural motion blur, warm tungsten light, documentary realism.' },
  { category: 'Cine', title: 'Duelo al atardecer', best: ['cinema-studio-4', 'wan-3'], params: { aspect_ratio: '21:9', genre: 'drama', camera_movement: 'slow-zoom-in' },
    prompt: 'Two gunslingers face each other on a dusty main street at golden hour, tumbleweed rolling between them, wind lifting their coats, extreme wide shot slowly pushing in, long shadows stretching across the sand, heat haze, 35mm film look with rich amber tones.' },
  { category: 'Cine', title: 'Despertar en la estación espacial', best: ['kling-3', 'seedance-2-5'],
    prompt: 'An astronaut floats awake inside a quiet space station module, dust particles drifting in a beam of earthlight through a round window, she reaches for a floating photograph, slow orbital camera around her, soft blue and white palette, weightless hair movement, contemplative mood.' },
  { category: 'Cine', title: 'Persecución en azoteas', best: ['kling-3', 'minimax-h3'], params: { camera_movement: 'tracking' },
    prompt: 'A parkour runner sprints across Hong Kong rooftops at dusk and leaps a gap between buildings, the camera tracks alongside in one fluid motion, city lights flickering on below, laundry lines snapping in the wind, dramatic sky, high shutter speed crispness, intense cinematic energy.' },
  { category: 'Cine', title: 'Carta que nunca llegó', best: ['cinema-studio-4', 'seedance-2-5'], params: { era: '1960s', genre: 'drama', camera_model: '35mm-film' },
    prompt: 'A woman in a 1960s apartment reads a handwritten letter by the window, rain streaking the glass, her hand slowly trembles, soft window light on her face, shallow depth of field, muted pastel palette, 35mm film grain, quiet emotional close-up.' },
  { category: 'Cine', title: 'Tráiler de terror', best: ['cinema-studio-4', 'kling-3'], params: { genre: 'horror', light: 'silhouette' },
    prompt: 'A child in pajamas holds a flashlight at the end of a long hallway, the beam trembles, a door at the far end slowly creaks open by itself, the camera creeps forward at floor level, cold blue moonlight, deep shadows, unsettling silence, horror trailer atmosphere.' },
  { category: 'Cine', title: 'Montaje de un viaje en tren', best: ['kling-3'],
    shots: [
      { prompt: 'Close-up of a steaming cup of tea on a train table, fields blurring past the window at golden hour', duration: 3 },
      { prompt: 'A young man leans his head against the window, earphones in, watching the countryside', duration: 3 },
      { prompt: 'Wide exterior shot of a red train crossing a stone bridge over a misty valley', duration: 4 },
    ],
    prompt: 'A nostalgic train journey montage through the countryside at golden hour, warm film tones, gentle pacing.' },

  // ---------- Producto y anuncios ----------
  { category: 'Producto y anuncios', title: 'Perfume entre pétalos', best: ['seedance-2-5', 'kling-3'], params: { aspect_ratio: '9:16' },
    prompt: 'A crystal perfume bottle rotates slowly on a black glossy pedestal while deep purple rose petals fall in slow motion around it, a single beam of light catches the glass and creates rainbow caustics, luxury commercial style, macro detail, seamless loop feel.' },
  { category: 'Producto y anuncios', title: 'Zapatilla que explota en piezas', best: ['kling-3', 'seedance-2-5'],
    prompt: 'A running sneaker hovers in a white studio and explodes into its individual components in slow motion, laces, sole layers and mesh floating apart in a perfect exploded view, then snaps back together, crisp studio lighting, product-launch commercial, 4K sharpness.' },
  { category: 'Producto y anuncios', title: 'Lata de refresco helada', best: ['seedance-2-5', 'pixverse-v6'],
    prompt: 'An ice-cold soda can bursts up through crushed ice, condensation droplets rolling down the aluminum, splash of fizzy liquid frozen mid-air, hyper-real macro, vibrant saturated colors, energetic beverage commercial with punchy camera push-in.' },
  { category: 'Producto y anuncios', title: 'Reloj de lujo en macro', best: ['kling-3', 'wan-3'],
    prompt: 'Extreme macro of a mechanical luxury watch, the camera glides across the brushed steel case and into the dial as the second hand ticks, gears turning behind a sapphire caseback, dramatic rim lighting on black, slow elegant motion, premium advertising look.' },
  { category: 'Producto y anuncios', title: 'Skincare con agua', best: ['seedance-2-5', 'minimax-h3'], params: { aspect_ratio: '9:16' },
    prompt: 'A frosted glass serum bottle stands in shallow crystal-clear water, gentle ripples spread as a drop falls from above, soft diffused daylight, pale lilac and white palette, calm minimalist skincare commercial, slow motion, clean negative space for text.' },
  { category: 'Producto y anuncios', title: 'Coche en el desierto de sal', best: ['kling-3', 'cinema-studio-4'], params: { aspect_ratio: '21:9' },
    prompt: 'A sleek electric car drives across a mirror-like salt flat at dawn, perfect reflection beneath it, drone shot pulling back to reveal the endless horizon, pastel pink and violet sky, dust trailing behind, automotive commercial grade color grading.' },
  { category: 'Producto y anuncios', title: 'Unboxing de auriculares', best: ['seedance-2-5'],
    prompt: 'Top-down shot of hands opening a matte black box to reveal wireless earbuds glowing with a soft purple LED, the lid lifts in slow motion, tissue paper unfolds, satisfying tactile details, clean studio light, modern tech unboxing ad.' },
  { category: 'Producto y anuncios', title: 'Hamburguesa que se arma', best: ['kling-3', 'pixverse-v6'],
    prompt: 'Burger ingredients drop one by one in slow motion onto a toasted bun, lettuce, cheese melting over a sizzling patty, tomato slices, sesame top bun landing with a bounce, sauce splashes, dark moody background with warm spotlight, fast-food commercial energy.' },

  // ---------- Moda y retrato ----------
  { category: 'Moda y retrato', title: 'Pasarela de agua', best: ['kling-3', 'seedance-2-5'], params: { aspect_ratio: '9:16' },
    prompt: 'A model in a flowing silver gown walks down a runway covered in a thin layer of water, each step sends ripples and splashes glittering under stage lights, low-angle tracking shot, audience silhouettes in the dark, high-fashion show atmosphere.' },
  { category: 'Moda y retrato', title: 'Retrato con viento', best: ['kling-3', 'hailuo-2-3'],
    prompt: 'Close-up portrait of a woman with long dark hair on a cliff at sunset, strong wind blowing her hair and silk scarf across her face, she turns to look at the camera and smiles softly, golden backlight, shallow depth of field, editorial fashion film.' },
  { category: 'Moda y retrato', title: 'Editorial en blanco y negro', best: ['cinema-studio-4', 'seedance-2-5'], params: { color_palette: 'the-grey-channel' },
    prompt: 'Black and white fashion editorial, a male model in an oversized wool coat stands still while the camera slowly orbits him, hard side light creating sculpted shadows, grainy high-contrast film, minimalist concrete studio, timeless magazine aesthetic.' },
  { category: 'Moda y retrato', title: 'Street style en Tokio', best: ['seedance-2-5', 'minimax-h3'], params: { aspect_ratio: '9:16' },
    prompt: 'A stylish young woman in layered streetwear crosses Shibuya crossing, the camera walks backwards in front of her, crowds flowing around, neon billboards glowing at dusk, confident stride, vibrant street-style video for social media.' },
  { category: 'Moda y retrato', title: 'Maquillaje en primer plano', best: ['kling-3', 'wan-3'],
    prompt: 'Extreme close-up of an eye as iridescent purple eyeshadow shimmers under a moving ring light, eyelashes flutter, glitter particles catch the light, beauty commercial macro, soft focus background, luxurious and precise.' },
  { category: 'Moda y retrato', title: 'Baile en el estudio', best: ['seedance-2-5', 'kling-3'],
    prompt: 'A contemporary dancer in a white studio performs fluid spinning movements, fabric of her dress trailing in slow motion, the camera circles her at waist height, soft high-key lighting, graceful and emotional, clean minimalist aesthetic.' },

  // ---------- Naturaleza y viajes ----------
  { category: 'Naturaleza y viajes', title: 'Aurora sobre el lago', best: ['wan-3', 'kling-3'], params: { aspect_ratio: '16:9' },
    prompt: 'Timelapse of green and violet aurora borealis dancing over a frozen lake in Norway, snow-covered mountains reflected in patches of ice, stars rotating slowly, a small cabin with warm light in the foreground, breathtaking wide landscape.' },
  { category: 'Naturaleza y viajes', title: 'Dron sobre la selva', best: ['kling-3', 'minimax-h3'], params: { camera_movement: 'aerial-pullback' },
    prompt: 'Drone flies low over a dense tropical rainforest canopy at sunrise, mist rolling between the trees, then rises to reveal a massive waterfall plunging into a turquoise pool, birds flying past, lush saturated greens, epic nature documentary.' },
  { category: 'Naturaleza y viajes', title: 'Ola perfecta', best: ['seedance-2-5', 'wan-3'],
    prompt: 'A surfer rides inside a perfect turquoise barrel wave, sunlight filtering through the curling water, spray catching the light, camera follows from inside the tube, slow motion, crystal clear ocean, exhilarating action.' },
  { category: 'Naturaleza y viajes', title: 'Calle de Marrakech', best: ['seedance-2-5', 'kling-3'],
    prompt: 'Walking POV through a narrow alley in the Marrakech medina, colorful lanterns hanging overhead, spice stalls with vivid pyramids of saffron and paprika, a cat crosses the path, warm afternoon light filtering down, immersive travel vlog feel.' },
  { category: 'Naturaleza y viajes', title: 'Tormenta en la pradera', best: ['wan-3', 'cinema-studio-4'],
    prompt: 'A massive supercell thunderstorm rotates over golden wheat fields, lightning forking across the purple sky, wind rippling the grain in waves, a lone farmhouse in the distance, dramatic timelapse clouds, awe-inspiring and ominous.' },
  { category: 'Naturaleza y viajes', title: 'Zorro en la nieve', best: ['kling-3', 'hailuo-2-3'],
    prompt: 'A red fox pounces headfirst into deep fresh snow hunting under the surface, snow bursting around it in slow motion, soft falling snowflakes, telephoto wildlife documentary shot, muted winter tones with the fox as the only warm color.' },

  // ---------- Acción y deporte ----------
  { category: 'Acción y deporte', title: 'Mate en cámara lenta', best: ['kling-3', 'seedance-2-5'],
    prompt: 'A basketball player soars for a slam dunk in an empty arena, the camera circles him in bullet-time at the peak of the jump, sweat droplets suspended in the air, dramatic spotlights, then real-time speed as the ball slams through the net.' },
  { category: 'Acción y deporte', title: 'Motocross en el barro', best: ['kling-3', 'pixverse-v6'],
    prompt: 'A motocross rider launches off a dirt ramp and whips the bike sideways mid-air, mud spraying from the rear wheel, low-angle shot from the ground as the bike flies overhead against a stormy sky, gritty extreme-sports energy.' },
  { category: 'Acción y deporte', title: 'Boxeo con sudor', best: ['kling-3', 'cinema-studio-4'], params: { light: 'overhead-fall' },
    prompt: 'Two boxers trade punches in a dim gym ring, a single overhead light cuts through the haze, sweat sprays in slow motion as a punch lands, tight handheld close-ups, gritty high-contrast grade, raw documentary intensity.' },
  { category: 'Acción y deporte', title: 'Esquí fuera de pista', best: ['wan-3', 'kling-3'],
    prompt: 'A skier carves down a steep powder slope, huge plumes of snow exploding behind each turn, drone follows from above and slightly behind, bright blue sky and sharp mountain ridges, crisp high-altitude light, adrenaline sports film.' },
  { category: 'Acción y deporte', title: 'Fútbol: gol de chilena', best: ['kling-3', 'seedance-2-5'],
    prompt: 'A soccer player performs a bicycle kick in a packed stadium at night, the camera freezes mid-air and rotates around him, then the ball rockets into the net and the crowd erupts, confetti and flares, broadcast-quality sports highlight.' },
  { category: 'Acción y deporte', title: 'Tres tomas de parkour', best: ['kling-3'],
    shots: [
      { prompt: 'Wide shot: a traceur sprints toward a concrete wall in an abandoned parking garage', duration: 3 },
      { prompt: 'Low angle: he wall-runs and flips over a railing in slow motion', duration: 3 },
      { prompt: 'Close-up: he lands, breathes hard and looks straight into the camera', duration: 3 },
    ],
    prompt: 'Urban parkour sequence in an abandoned parking garage, gritty cinematic look, dynamic camera.' },

  // ---------- Fantasía y VFX ----------
  { category: 'Fantasía y VFX', title: 'Dragón sobre el castillo', best: ['kling-3', 'wan-3'], params: { aspect_ratio: '21:9' },
    prompt: 'A colossal obsidian dragon glides over a medieval castle at dusk, its wings casting a moving shadow over the towers, embers drifting from its mouth, knights on the walls look up in awe, sweeping crane shot, epic fantasy film scale.' },
  { category: 'Fantasía y VFX', title: 'Ciudad que se pliega', best: ['kling-3', 'seedance-2-5'],
    prompt: 'A city street slowly folds upward like paper until the buildings arch overhead into a tunnel, a man in a suit keeps walking calmly as gravity shifts, mind-bending surreal visual effect, cool daylight, Inception-style spectacle.' },
  { category: 'Fantasía y VFX', title: 'Portal mágico en el bosque', best: ['kling-3', 'minimax-h3'],
    prompt: 'A girl in a hooded cloak raises her hand in a misty forest and a swirling portal of violet light opens between two ancient trees, leaves spiraling into it, glowing particles, her face lit by the magic, fantasy adventure mood.' },
  { category: 'Fantasía y VFX', title: 'Cuerpo de cristal líquido', best: ['kling-3', 'seedance-2-5'],
    prompt: 'A woman\'s silhouette made entirely of flowing liquid glass walks forward, light refracting through her body into rainbow caustics on the floor, each step sends ripples through her form, black background, surreal high-end VFX.' },
  { category: 'Fantasía y VFX', title: 'Cyberpunk con lluvia de neón', best: ['cinema-studio-4', 'kling-3'], params: { color_palette: 'neon-rain-at-midnight' },
    prompt: 'A cyberpunk street at night, rain falling through holographic advertisements, a courier on a glowing motorbike weaves through traffic, flying cars overhead, reflections everywhere, magenta and violet neon, Blade Runner inspired atmosphere.' },
  { category: 'Fantasía y VFX', title: 'Ballena en las nubes', best: ['wan-3', 'kling-3'],
    prompt: 'A giant humpback whale swims slowly through golden sunset clouds high above a small village, children on rooftops point upward, beams of light pass through the clouds, dreamlike magical realism, gentle and majestic.' },

  // ---------- Comida ----------
  { category: 'Comida', title: 'Ramen humeante', best: ['seedance-2-5', 'kling-3'],
    prompt: 'Chopsticks lift glossy ramen noodles out of a steaming bowl, broth dripping, soft-boiled egg glistening, steam curling up in a warm backlight, slow motion macro, cozy late-night ramen shop ambience, appetizing food film.' },
  { category: 'Comida', title: 'Chocolate fundido', best: ['kling-3', 'pixverse-v6'],
    prompt: 'Rich melted chocolate pours in a slow silky ribbon over a stack of pancakes, fresh berries tumble down the sides, powdered sugar dusts from above, macro close-up, warm natural light, indulgent dessert commercial.' },
  { category: 'Comida', title: 'Pizza que se estira', best: ['seedance-2-5', 'hailuo-2-3'],
    prompt: 'A hand pulls a slice from a wood-fired pizza, mozzarella stretching in long gooey strands, basil and bubbling tomato sauce, embers glowing in the oven behind, slow motion, rustic Italian trattoria atmosphere.' },
  { category: 'Comida', title: 'Cóctel con humo', best: ['kling-3', 'wan-3'],
    prompt: 'A bartender lifts a glass dome off an old fashioned cocktail and aromatic smoke spills out in slow motion, a large clear ice cube, orange peel twist, dim speakeasy lighting with warm amber highlights, luxurious bar commercial.' },
  { category: 'Comida', title: 'Tacos al pastor', best: ['seedance-2-5', 'minimax-h3'],
    prompt: 'A taquero shaves glistening al pastor meat from a rotating trompo at a street stand in Mexico City at night, pineapple flies onto the taco, cilantro and onion sprinkled, sizzling sounds, handheld close-up, vibrant authentic street food video.' },

  // ---------- Redes sociales ----------
  { category: 'Redes sociales', title: 'Transición de outfit', best: ['seedance-2-5', 'pixverse-v6'], params: { aspect_ratio: '9:16' },
    prompt: 'A young woman in a bedroom mirror spins once and her casual hoodie transforms into an elegant evening dress mid-spin, sparkles on the transition, vertical smartphone framing, bright soft light, trendy social media outfit-change video.' },
  { category: 'Redes sociales', title: 'Mascota influencer', best: ['kling-3', 'hailuo-2-3'], params: { aspect_ratio: '9:16' },
    prompt: 'A golden retriever wearing tiny sunglasses sits in the driver seat of a convertible and turns its head to the camera, tongue out, palm trees passing by, sunny California afternoon, funny viral pet video, vertical format.' },
  { category: 'Redes sociales', title: 'Reacción de sorpresa', best: ['seedance-2-5', 'minimax-h3'], params: { aspect_ratio: '9:16' },
    prompt: 'Selfie-style vertical video, a young man opens a package and his face lights up with genuine surprise, he laughs and covers his mouth, ring-light reflection in his eyes, natural home lighting, authentic UGC reaction.' },
  { category: 'Redes sociales', title: 'Rutina de mañana estética', best: ['seedance-2-5', 'kling-3'], params: { aspect_ratio: '9:16' },
    prompt: 'Aesthetic morning routine: sunlight through linen curtains, hands pour coffee into a ceramic mug, a plant on the windowsill sways, a journal opens, soft beige and lilac tones, calm slow pacing, cozy lifestyle reel.' },
  { category: 'Redes sociales', title: 'Podcast con dos cámaras', best: ['kling-3'],
    shots: [
      { prompt: 'Medium shot of a host at a podcast desk with a large microphone, laughing at a joke, warm studio lights', duration: 3 },
      { prompt: 'Close-up of the guest leaning in to make a point with expressive hands', duration: 3 },
      { prompt: 'Wide shot of both, purple LED strip in the background, cozy studio vibe', duration: 3 },
    ],
    prompt: 'A lively podcast conversation in a cozy studio with purple accent lighting.' },

  // ---------- Arquitectura ----------
  { category: 'Arquitectura', title: 'Casa en el acantilado', best: ['wan-3', 'kling-3'],
    prompt: 'A modern concrete and glass house cantilevered over a cliff above a stormy sea, the camera flies slowly around it at twilight, interior lights glowing warm, waves crashing below, architectural film with cinematic grade.' },
  { category: 'Arquitectura', title: 'Recorrido por un loft', best: ['seedance-2-5', 'kling-3'], params: { camera_movement: 'dolly-in' },
    prompt: 'Smooth gimbal walkthrough of a sunlit industrial loft, exposed brick, tall steel windows, a velvet purple sofa, plants and art books, dust motes floating in the light, real-estate showcase video, calm and inviting.' },
  { category: 'Arquitectura', title: 'Ciudad futurista al amanecer', best: ['wan-3', 'minimax-h3'],
    prompt: 'Aerial flyover of a futuristic eco-city at sunrise, vertical gardens on curved skyscrapers, maglev trains gliding between towers, solar sails catching the light, utopian optimistic atmosphere, ultra-detailed.' },
  { category: 'Arquitectura', title: 'Catedral con haces de luz', best: ['cinema-studio-4', 'wan-3'],
    prompt: 'Inside a vast gothic cathedral, beams of colored light pour through stained-glass windows and slowly move across the stone floor, incense smoke drifting, the camera tilts up toward the vaulted ceiling, sacred awe-inspiring mood.' },

  // ---------- Animación ----------
  { category: 'Animación', title: 'Estilo anime: tren de verano', best: ['kling-3', 'seedance-2-5'],
    prompt: 'Anime style, a schoolgirl sits alone on a summer train by the sea, cicadas buzzing, her hair moves in the breeze from an open window, puffy white clouds, vibrant blue sky, hand-painted background, nostalgic slice-of-life mood.' },
  { category: 'Animación', title: 'Plastilina: el pequeño chef', best: ['kling-3', 'pixverse-v6'],
    prompt: 'Claymation style, a tiny chef made of plasticine flips a pancake that lands on his head, stop-motion jitter, handmade textures and fingerprints visible, warm kitchen set, charming and funny.' },
  { category: 'Animación', title: 'Pixar: robot jardinero', best: ['kling-3', 'wan-3'],
    prompt: '3D animated film style, a small rusty robot waters a single flower growing through cracked concrete in an abandoned city, it tilts its head curiously as a butterfly lands on its hand, warm sunset light, heartwarming Pixar-like storytelling.' },
  { category: 'Animación', title: 'Acuarela en movimiento', best: ['seedance-2-5', 'minimax-h3'],
    prompt: 'Animated watercolor painting of a fishing village at dawn, pigments bleeding and blooming as boats drift out to sea, paper texture visible, soft washes of lilac and peach, gentle poetic motion.' },
];

export const TRANSFORM_PROMPTS = [
  { category: 'Estilo', title: 'Convertir en anime', prompt: 'Transform the entire video into a hand-drawn anime style with cel shading and painted backgrounds, keeping the original motion and camera exactly the same.' },
  { category: 'Estilo', title: 'Estatua de mármol', prompt: 'Turn the main character into a white marble statue with subtle veins while preserving every movement of the original video.' },
  { category: 'Estilo', title: 'Acuarela', prompt: 'Restyle the video as a soft watercolor painting with visible paper texture and bleeding pigments, same composition and motion.' },
  { category: 'Estilo', title: 'Claymation', prompt: 'Convert the scene into claymation with plasticine textures and slight stop-motion jitter, keep the timing and camera movement.' },
  { category: 'Estilo', title: 'Película de los 80', prompt: 'Give the video an authentic 1980s VHS look: soft focus, chromatic aberration, tracking lines and warm faded colors, without changing the action.' },
  { category: 'Ropa y aspecto', title: 'Traje futurista', prompt: 'Replace the outfit with a sleek futuristic suit with glowing purple seams, keep the person, pose and movement unchanged.' },
  { category: 'Ropa y aspecto', title: 'Cambiar color de pelo', prompt: 'Change the hair color to pastel lavender while keeping the hairstyle, face and all motion identical.' },
  { category: 'Ropa y aspecto', title: 'Vestido de gala', prompt: 'Swap the clothing for an elegant black evening gown with subtle sparkles, preserving the body movement and camera.' },
  { category: 'Escenario', title: 'Fondo nevado de noche', prompt: 'Replace the background with a snowy pine forest at night with warm cabin lights, keeping the subject and motion untouched.' },
  { category: 'Escenario', title: 'Playa al atardecer', prompt: 'Move the scene to a tropical beach at sunset with gentle waves behind the subject, match the lighting to warm golden hour.' },
  { category: 'Escenario', title: 'Estudio minimalista', prompt: 'Replace the environment with a clean white photo studio with soft shadows, keep the subject exactly as it is.' },
  { category: 'Escenario', title: 'Ciudad cyberpunk', prompt: 'Change the setting to a rainy cyberpunk street with neon signs and reflections, relight the subject with magenta and violet neon.' },
  { category: 'Objetos', title: 'Cambiar el coche', prompt: 'Replace the car with a vintage red convertible while keeping the road, camera path and speed identical.' },
  { category: 'Objetos', title: 'Taza por lata', prompt: 'Swap the coffee mug in the person\'s hand for a matte purple soda can, keep the hand movement natural.' },
  { category: 'Objetos', title: 'Añadir mascota', prompt: 'Add a small fluffy white dog walking beside the person, matching their pace and the scene lighting.' },
  { category: 'Clima y luz', title: 'Hacer que llueva', prompt: 'Add heavy rain with wet reflective surfaces and droplets on the lens, darken the sky to a moody overcast, keep all motion.' },
  { category: 'Clima y luz', title: 'De día a noche', prompt: 'Convert the scene from daytime to night with streetlights, moonlight and illuminated windows, preserving the action.' },
  { category: 'Clima y luz', title: 'Hora dorada', prompt: 'Relight the entire video with warm golden hour sunlight and long soft shadows, without changing anything else.' },
  { category: 'Movimiento', title: 'Baile viral', prompt: 'The character from the image performs the exact dance moves from the reference video, same rhythm and camera framing.' },
  { category: 'Movimiento', title: 'Caminar a cámara', prompt: 'The character from the image walks toward the camera exactly like the person in the reference video, keep natural cloth movement.' },
  { category: 'Extender', title: 'Continuar la escena', prompt: 'Continue the scene naturally for a few more seconds: the camera keeps moving in the same direction and the action completes smoothly.' },
  { category: 'Extender', title: 'Final sorpresa', prompt: 'Extend the video with an unexpected ending: the subject turns around and smiles at the camera as the light slowly fades.' },
];

// Consejos por familia (se muestran bajo el prompt).
export const MODEL_TIPS = {
  'kling-3': [
    'Estructura que funciona: sujeto + acción + entorno + cámara + luz + estilo.',
    'Activa «Varias tomas» para contar una mini historia: hasta 6 planos con su duración.',
    'Describe un solo movimiento de cámara claro (dolly in, orbit, tracking) por plano.',
  ],
  'kling-o3': ['Usa primer y último fotograma para controlar exactamente dónde empieza y termina el plano.', 'Las referencias de imagen fijan personajes y objetos entre tomas.'],
  'kling-omni': ['Combina referencias de imagen y de video: el video aporta el movimiento, la imagen el aspecto.'],
  'kling-3-motion-control': ['Sube un video de al menos 4 s con el movimiento y una imagen del personaje de cuerpo entero.', 'El prompt es opcional: úsalo para el estilo o el entorno.'],
  'kling-2-6-motion-control': ['El video fuente define el movimiento; la imagen define quién se mueve.'],
  'seedance-2-5': ['Seedance entiende prompts largos y detallados: describe la acción paso a paso.', 'En «Referencias» mezcla imágenes, videos y audio; hasta 30 s de video.', 'El audio nativo sigue lo que describes: menciona sonidos (lluvia, voces, música).'],
  'seedance-2': ['Describe el movimiento con verbos concretos y un ritmo claro (lento, suave, repentino).'],
  'cinema-studio-4': ['Aprovecha los controles de cámara, lente, época, género y paleta: el prompt solo necesita la escena.', 'Combina género «noir» con luz «practicals» para escenas nocturnas muy cinematográficas.'],
  'wan-3': ['Wan 3.0 destaca en paisajes y planos amplios; activa el razonamiento para prompts complejos.', 'Genera audio: describe el ambiente sonoro.'],
  'wan-3-prime': ['La versión Prime da más detalle: ideal para planos finales.'],
  'minimax-h3': ['Muy bueno con personas y expresiones: describe emociones y microgestos.'],
  'hailuo-2-3': ['Activa «Optimizar prompt» si escribes ideas cortas.'],
  'pixverse-v6': ['Rápido y con sonido: perfecto para pruebas y clips para redes.'],
  'ltx-2-5': ['Usa la variante rápida para iterar y la Pro para la versión final.'],
  genjutsu: ['Transferencia de movimiento: video de 4 s o más + imágenes del nuevo personaje.', 'Cambio de objeto: describe con precisión qué objeto sustituir y por cuál.'],
  'soul-2': ['SOUL brilla en retratos, moda y editorial: menciona luz, lente y estilismo.', 'Elige un estilo SOUL y ajusta la intensidad; entrena un Soul ID para mantener tu personaje.'],
  'soul-standard': ['Los estilos SOUL cambian mucho el resultado: prueba varios con el mismo prompt.'],
  'soul-cinema': ['Piensa en un fotograma de película: plano, época, luz y emoción.'],
  'marketing-studio-image': ['Con «Mejorar prompt» + un preset, sube la foto del producto (y opcionalmente una modelo).'],
  'recraft-v4-1': ['Ideal para logos, iconos e ilustración vectorial; define la paleta RGB.'],
  'recraft-v4-1-pro': ['Versión 2K para gráficos listos para imprimir.'],
  'ideogram-4': ['El mejor para texto dentro de la imagen: pon el texto entre comillas.'],
  'qwen-image-3': ['Excelente siguiendo instrucciones largas y con texto en varios idiomas.'],
  'grok-image-2': ['Hasta 10 referencias: combina estilos, personas y objetos.'],
  'z-image-turbo': ['Muy rápido: úsalo para explorar ideas antes de la versión final.'],
};

export const GENERAL_TIPS = {
  image: ['Sé específico: sujeto, acción, entorno, luz, lente y estilo.', 'Los prompts con [CORCHETES] son plantillas: cambia lo que va dentro.'],
  video: ['Un buen prompt de video: sujeto + acción + cámara + luz + ambiente.', 'Los modelos de video entienden mejor el inglés; puedes escribir en español si prefieres.'],
  transform: ['Di qué cambia y qué debe mantenerse igual (movimiento, cámara, persona).'],
};

/* Skinora AI scent finder: questions, scent profiles and copy. */
(function () {
  // Scent families. Every answer and every product is a mix of these.
  var FAM = {
    fresh: { n: 'Fresh', d: 'sea air, clean skin, cool water', c: '#8FB3B0' },
    citrus: { n: 'Citrus', d: 'bergamot, mandarin, grapefruit', c: '#D9B44A' },
    floral: { n: 'Floral', d: 'rose, jasmine, orange blossom', c: '#C98A93' },
    green: { n: 'Green and herbal', d: 'sage, lavender, tea leaves', c: '#8C9A6E' },
    woody: { n: 'Woody', d: 'sandalwood, cedar, oud', c: '#8A6A4F' },
    warm: { n: 'Warm and sweet', d: 'vanilla, praline, amber', c: '#B98A55' },
    spicy: { n: 'Spicy', d: 'pepper, cardamom, cinnamon', c: '#A4553F' },
    musky: { n: 'Soft musk', d: 'white musk, cotton, warm skin', c: '#B9AFA4' }
  };

  // Five questions. v = how much each answer adds to each family. m = mood, tm = time, s = strength (1 to 3).
  // g = which shoppers see the option (women, men, all). No g = everyone.
  var Q = [
    { k: 'who', eye: 'Before we start', q: 'Who is the scent for?', sub: 'We only show fragrances made for them.', o: [
      { id: 'women', t: 'For her', d: 'Women\'s fragrances', sw: ['#F1D9D6', '#C98A93'], v: {} },
      { id: 'men', t: 'For him', d: 'Men\'s fragrances', sw: ['#D8CFC2', '#3B2F2A'], v: {} },
      { id: 'all', t: 'For anyone', d: 'Show me everything, including unisex', sw: ['#E9E4DA', '#B9AFA4'], v: {} }
    ] },
    { k: 'mood', eye: 'Your mood', q: 'Pick the mood you want to wear', sub: 'How do you want to feel when you smell it on yourself?', o: [
      { id: 'calm', t: 'Calm and slow', d: 'A quiet Sunday, nowhere to be', sw: ['#E9E4DA', '#C9D3CC'], v: { musky: .6, fresh: .3, green: .2 }, m: 'calm' },
      { id: 'romantic', t: 'Romantic', d: 'Soft light, someone special', sw: ['#F1D9D6', '#C98A93'], v: { floral: .6, warm: .3, musky: .1 }, m: 'romantic' },
      { id: 'confident', t: 'Confident', d: 'Walking into the room like you own it', sw: ['#D8CFC2', '#5E5247'], v: { woody: .4, citrus: .3, spicy: .2 }, m: 'confident' },
      { id: 'playful', t: 'Playful', d: 'Sunshine, laughing, a bit cheeky', sw: ['#F6E2A8', '#E59C7B'], v: { citrus: .5, warm: .3, floral: .2 }, m: 'playful' },
      { id: 'mysterious', t: 'Mysterious', d: 'Late nights, a little hard to read', sw: ['#4B3B3F', '#A4553F'], v: { woody: .4, spicy: .4, warm: .3 }, m: 'mysterious' }
    ] },
    { k: 'place', eye: 'Your happy place', q: 'Where would you rather be right now?', sub: 'Places we love hold the smells we love.', o: [
      { id: 'beach', t: 'A quiet beach at sunrise', d: 'Salt air, warm sand, coconut palms', sw: ['#BFD8D6', '#F3D9B1'], v: { fresh: .9, citrus: .3, green: .2 }, notes: ['sea salt', 'bergamot'] },
      { id: 'tea', t: 'Misty tea hills', d: 'Cool mist, wet leaves, a hot cup', sw: ['#A9B89A', '#E5E8DD'], v: { green: .9, fresh: .4, woody: .2 }, notes: ['sage', 'green tea'] },
      { id: 'garden', t: 'A garden of roses and jasmine', d: 'Petals everywhere after the rain', sw: ['#F0D3D3', '#F7F1E6'], v: { floral: 1, citrus: .1 }, notes: ['rose', 'jasmine'] },
      { id: 'cafe', t: 'A little bakery and café', d: 'Vanilla, caramel and fresh pastry', sw: ['#EBD6BD', '#B98A55'], v: { warm: 1, floral: .2 }, notes: ['vanilla', 'praline'] },
      { id: 'temple', t: 'An old temple at dusk', d: 'Sandalwood, incense and oil lamps', sw: ['#8A6A4F', '#E8C98E'], v: { woody: .9, spicy: .3, warm: .3 }, notes: ['sandalwood', 'incense'] },
      { id: 'spice', t: 'A busy spice market', d: 'Cinnamon, cardamom and cloves', sw: ['#A4553F', '#E3B26B'], v: { spicy: 1, warm: .3, citrus: .2 }, notes: ['cardamom', 'pepper'] }
    ] },
    { k: 'outfit', eye: 'Your outfit', q: 'Which outfit feels most like you?', sub: 'Your scent should go with what you wear.', o: [
      { id: 'linen', t: 'A crisp white linen shirt', d: 'Easy, clean, effortless', sw: ['#FBFAF6', '#DCE3E1'], v: { fresh: .5, citrus: .4, musky: .3 }, s: -0.5 },
      { id: 'dress', g: ['women'], t: 'A floaty summer dress', d: 'Pretty, light and bright', sw: ['#F6DCD5', '#F3E7B8'], v: { floral: .6, citrus: .3, warm: .1 }, m: 'playful' },
      { id: 'tee', g: ['men'], t: 'A T-shirt, jeans and trainers', d: 'Relaxed, easy, weekend mode', sw: ['#DCE3E1', '#5E6B78'], v: { citrus: .4, fresh: .4, warm: .2 }, m: 'playful' },
      { id: 'bright', g: ['all'], t: 'Something bright and fun', d: 'Colour, prints, a bit cheeky', sw: ['#F6E2A8', '#E59C7B'], v: { citrus: .5, floral: .3, warm: .1 }, m: 'playful' },
      { id: 'tailored', t: 'Something tailored and black', d: 'Sharp, sleek, polished', sw: ['#2A2725', '#7A7068'], v: { woody: .5, spicy: .3, citrus: .2 }, m: 'confident', s: 0.5 },
      { id: 'knit', t: 'A soft knit and comfy joggers', d: 'Cosy, warm, at home', sw: ['#E7DED2', '#C8B8A6'], v: { musky: .7, warm: .4 }, m: 'calm', s: -0.5 },
      { id: 'leather', t: 'A leather jacket', d: 'A bit of edge', sw: ['#3B2F2A', '#8A6A4F'], v: { woody: .5, spicy: .5, warm: .2 }, m: 'mysterious', s: 0.5 },
      { id: 'saree', g: ['women'], t: 'A silk saree for a wedding', d: 'Rich colour, gold, a big night', sw: ['#9C2F45', '#D8B05C'], v: { floral: .5, warm: .6, spicy: .1 }, m: 'romantic', s: 1, tm: 'evening' },
      { id: 'suit', g: ['men'], t: 'A sharp suit for a wedding', d: 'Polished, rich, a big night', sw: ['#1F2A3A', '#C6A15B'], v: { woody: .5, warm: .4, spicy: .3 }, m: 'confident', s: 1, tm: 'evening' },
      { id: 'wedding', g: ['all'], t: 'Dressed up for a wedding', d: 'Your very best, a big night', sw: ['#9C2F45', '#D8B05C'], v: { warm: .5, floral: .3, woody: .3 }, m: 'romantic', s: 1, tm: 'evening' }
    ] },
    { k: 'when', eye: 'Your moments', q: 'When will you wear it most?', sub: 'Light scents suit the day. Rich ones shine at night.', o: [
      { id: 'day', t: 'Work and daytime', d: 'Office, errands, lunch with friends', sw: ['#F7F1E6', '#DCE3E1'], v: { fresh: .3, citrus: .3 }, tm: 'day' },
      { id: 'evening', t: 'Evenings and dates', d: 'Dinner, drinks, dancing', sw: ['#4B3B3F', '#C98A93'], v: { warm: .3, woody: .2 }, tm: 'evening' },
      { id: 'events', t: 'Weddings and big nights', d: 'When you want to be remembered', sw: ['#9C2F45', '#E8C98E'], v: { warm: .3, floral: .2, spicy: .1 }, tm: 'evening', s: 1 },
      { id: 'any', t: 'Every day, everywhere', d: 'One scent that does it all', sw: ['#E9E4DA', '#B9AFA4'], v: {}, tm: 'any' }
    ] },
    { k: 'strength', eye: 'Your trail', q: 'How should people notice it?', sub: 'This decides how strong your match should be.', o: [
      { id: 's1', t: 'Only when they hug me', d: 'Close to the skin, just for me', sw: ['#F4EFE8', '#E9E4DA'], s: 1, v: { musky: .2 } },
      { id: 's2', t: 'When I walk past', d: 'A soft trail, noticed but never loud', sw: ['#E9E4DA', '#C9B79F'], s: 2, v: {} },
      { id: 's3', t: 'They remember it after I leave', d: 'Rich, long-lasting, unforgettable', sw: ['#C9B79F', '#8A6A4F'], s: 3, v: { warm: .1, woody: .1 } }
    ] }
  ];

  // Scent profiles for the catalogue. v = family mix, m = moods, t = best time, s = strength 1 to 3,
  // n = [top, heart, base] notes, l = one line in plain words. home = for the home, not the skin.
  var P = {
    'ysl-beauty-libre-eau-de-parfum': { v: { floral: .7, warm: .8, green: .5, citrus: .3 }, m: ['romantic', 'confident', 'mysterious'], t: 'evening', s: 3, n: ['Lavender, mandarin', 'Orange blossom, jasmine', 'Vanilla, musk'], fam: 'Floral amber', l: 'Warm lavender and orange blossom wrapped in soft vanilla. Free, bold and very grown-up.' },
    'chanel-coco-mademoiselle-eau-de-parfum': { v: { floral: .7, citrus: .6, woody: .5, musky: .4 }, m: ['confident', 'romantic'], t: 'any', s: 2, n: ['Orange, bergamot', 'Rose, jasmine', 'Patchouli, vetiver'], fam: 'Floral chypre', l: 'Bright orange and polished rose over clean patchouli. Elegant from morning to midnight.' },
    'lancome-la-vie-est-belle-eau-de-parfum': { v: { warm: 1, floral: .6, citrus: .3 }, m: ['playful', 'romantic'], t: 'any', s: 3, n: ['Blackcurrant, pear', 'Iris, jasmine', 'Praline, vanilla'], fam: 'Gourmand', l: 'Sweet praline and iris, like a patisserie on a spring morning. Happy in a bottle.' },
    'chanel-bleu-de-chanel-eau-de-parfum': { v: { woody: .8, citrus: .7, green: .5, spicy: .4 }, m: ['confident', 'calm'], t: 'any', s: 2, n: ['Grapefruit, mint', 'Ginger, jasmine', 'Sandalwood, incense'], fam: 'Woody aromatic', l: 'Crisp grapefruit over smooth sandalwood and a trail of incense. Quietly sure of itself.' },
    'tom-ford-oud-wood-eau-de-parfum': { v: { woody: 1, spicy: .6, warm: .6 }, m: ['mysterious', 'confident'], t: 'evening', s: 3, n: ['Cardamom, pepper', 'Oud, sandalwood', 'Vetiver, amber'], fam: 'Woody oriental', l: 'Smoky rare woods and warm cardamom. Rich, quiet and impossible to forget.' },
    'jo-malone-london-wood-sage-sea-salt-cologne': { v: { fresh: 1, green: .7, woody: .4 }, m: ['calm', 'playful'], t: 'day', s: 1, n: ['Ambrette seed', 'Sea salt', 'Sage, driftwood'], fam: 'Fresh woody', l: 'A windswept beach walk: sea spray, sage and driftwood. Easy to wear every day.' },
    'le-labo-santal-33-eau-de-parfum': { v: { woody: 1, musky: .5, spicy: .4 }, m: ['confident', 'mysterious', 'calm'], t: 'any', s: 2, n: ['Cardamom, violet', 'Iris, papyrus', 'Sandalwood, cedar'], fam: 'Woody', l: 'Smoky sandalwood, cardamom and soft leather. The cult scent people stop you to ask about.' },
    'maison-margiela-replica-lazy-sunday-morning': { v: { musky: 1, fresh: .7, floral: .4 }, m: ['calm'], t: 'day', s: 1, n: ['Aldehydes, pear', 'Lily of the valley, iris', 'White musk'], fam: 'Fresh musk', l: 'Clean white musk and cotton sheets on a slow morning. Like your skin, only better.' },
    'dior-miss-dior-eau-de-parfum': { v: { floral: 1, citrus: .3, musky: .3 }, m: ['romantic', 'playful'], t: 'day', s: 2, n: ['Mandarin', 'Grasse rose, peony', 'Iris, vanilla'], fam: 'Floral', l: 'An armful of fresh roses and peony with a powdery finish. Pretty, light and loving.' },
    'dior-sauvage-eau-de-toilette': { v: { fresh: .7, citrus: .7, spicy: .6, woody: .5 }, m: ['confident', 'playful'], t: 'any', s: 3, n: ['Calabrian bergamot', 'Sichuan pepper, lavender', 'Ambroxan, cedar'], fam: 'Fresh spicy', l: 'Peppery bergamot over a clean amber base. Fresh, strong and confident.' },
    'ysl-beauty-y-eau-de-parfum': { v: { fresh: .7, green: .7, warm: .4, woody: .4 }, m: ['confident', 'playful'], t: 'any', s: 2, n: ['Apple, ginger', 'Sage, geranium', 'Amberwood, tonka'], fam: 'Fresh aromatic', l: 'Crisp apple and sage over warm amber woods. Clean by day, warmer by night.' },
    // For the home: candles
    'diptyque-baies-scented-candle': { home: 1, v: { floral: .8, citrus: .4, green: .4 }, m: ['romantic', 'calm', 'playful'], n: ['Blackcurrant leaves', 'Bulgarian rose', ''], fam: 'Fruity rose', l: 'Blackcurrant leaves and rose. Makes any room feel like a garden.' },
    'jo-malone-london-pomegranate-noir-home-candle': { home: 1, v: { spicy: .6, woody: .6, warm: .4, citrus: .3 }, m: ['mysterious', 'confident', 'romantic'], n: ['Pomegranate, raspberry', 'Pink pepper', 'Patchouli, woods'], fam: 'Spicy fruity', l: 'Juicy pomegranate, pink pepper and dark woods. Instantly cosy and a little dramatic.' }
  };

  var PERSONA = {
    fam: { fresh: 'Sea Breeze', citrus: 'Sunlit', floral: 'Garden', green: 'Tea Garden', woody: 'Sandalwood', warm: 'Velvet', spicy: 'Spice Route', musky: 'Clean Linen' },
    mood: { calm: 'Dreamer', romantic: 'Romantic', confident: 'Icon', playful: 'Free Spirit', mysterious: 'Enigma' }
  };

  // Sample set: three 2 ml vials of the top matches.
  var SET = { id: 'sf-sample-set', slug: 'scent-sample-set', name: 'Scent Finder Sample Set', brand: 'Skinora', price: 3500, ml: 2, image: 'media/scent/sample-set.svg' };

  window.SKSF_DATA = { FAM: FAM, Q: Q, P: P, PERSONA: PERSONA, SET: SET };
})();

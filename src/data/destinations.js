/**
 * Curated destination catalogue. These are editorial reference entries with stable,
 * real-world facts (location, coordinates, highlights). Prices are indicative planning
 * estimates in INR, NOT live quotes — the UI must label them as estimates.
 * No real-time availability or pricing is claimed anywhere in the app.
 */

export const photo = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const categories = [
  { id: 'all', label: 'All destinations' },
  { id: 'beach', label: 'Beaches' },
  { id: 'mountain', label: 'Mountains' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'culture', label: 'Culture' },
  { id: 'history', label: 'History' },
];

export const destinations = [
  {
    id: 'ooty', name: 'Ooty', city: 'Ooty', country: 'India', region: 'Tamil Nadu', category: 'mountain',
    image: photo('photo-1506905925346-21bda4d32df4'),
    gallery: [photo('photo-1441974231531-c6227db76b6e'), photo('photo-1500534623283-312aade485b7')],
    description: 'A hill station of tea gardens, eucalyptus groves and cool mountain air in the Nilgiri hills. Ooty is a classic slow-travel base for nature walks and colonial-era architecture.',
    highlights: ['Nilgiri Mountain Railway', 'Ooty Lake', 'Botanical Gardens', 'Tea plantations', 'Doddabetta Peak'],
    tags: ['Hill station', 'Nature', 'Family'], coords: { lat: 11.4064, lng: 76.6932 }, idealDays: 3, avgDailyINR: 2600,
  },
  {
    id: 'goa', name: 'Goa', city: 'Panaji', country: 'India', region: 'Goa', category: 'beach',
    image: photo('photo-1507525428034-b723cf961d3e'),
    gallery: [photo('photo-1519046904884-53103b34b206'), photo('photo-1499793983690-e29da59ef1c2')],
    description: 'Sunlit coastline, Portuguese-era churches and laid-back beach towns. Goa works equally well for a quiet coastal break or a packed few days of water sports.',
    highlights: ['Anjuna Beach', 'Fortaleza da Aguada', 'Basilica of Bom Jesus', 'Dudhsagar Falls', 'Sunset cruise'],
    tags: ['Beach', 'Nightlife', 'Culture'], coords: { lat: 15.4909, lng: 73.8278 }, idealDays: 4, avgDailyINR: 3400,
  },
  {
    id: 'manali', name: 'Manali', city: 'Manali', country: 'India', region: 'Himachal Pradesh', category: 'adventure',
    image: photo('photo-1464822759023-fed622ff2c3b'),
    gallery: [photo('photo-1476514525535-07fb3b4ae5f1'), photo('photo-1501785888041-af3ef285b470')],
    description: 'A Himalayan gateway for trekking, river activities and snow in winter. Manali pairs high-altitude scenery with a lively backpacker scene.',
    highlights: ['Rohtang Pass', 'Solang Valley', 'Old Manali', 'Hadimba Temple', 'River rafting'],
    tags: ['Trekking', 'Himalayas', 'Adventure'], coords: { lat: 32.2396, lng: 77.1887 }, idealDays: 5, avgDailyINR: 3000,
  },
  {
    id: 'jaipur', name: 'Jaipur', city: 'Jaipur', country: 'India', region: 'Rajasthan', category: 'culture',
    image: photo('photo-1599661046827-dacff0c0f09a'),
    gallery: [photo('photo-1477587458883-47145ed94245'), photo('photo-1524492412937-b28074a5d7da')],
    description: 'The Pink City, built as a planned royal capital, is known for its forts, palaces, bazaars and a living craft tradition in textiles and jewellery.',
    highlights: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar', 'Johari Bazaar'],
    tags: ['Heritage', 'Food', 'Shopping'], coords: { lat: 26.9124, lng: 75.7873 }, idealDays: 3, avgDailyINR: 2800,
  },
  {
    id: 'munnar', name: 'Munnar', city: 'Munnar', country: 'India', region: 'Kerala', category: 'mountain',
    image: photo('photo-1500534623283-312aade485b7'),
    gallery: [photo('photo-1441974231531-c6227db76b6e'), photo('photo-1439066615861-d1af74d74000')],
    description: 'Rolling tea plantations and misty Western Ghats ridges. Munnar is a good choice for a quiet, scenic break with short hikes and tea-tasting stops.',
    highlights: ['Tea Museum', 'Eravikulam National Park', 'Mattupetty Dam', 'Topslip', 'Tea gardens'],
    tags: ['Tea', 'Nature', 'Couples'], coords: { lat: 10.0889, lng: 77.0595 }, idealDays: 3, avgDailyINR: 2700,
  },
  {
    id: 'agra', name: 'Agra', city: 'Agra', country: 'India', region: 'Uttar Pradesh', category: 'history',
    image: photo('photo-1524492412937-b28074a5d7da'),
    gallery: [photo('photo-1548013146-72479768bada'), photo('photo-1599661046827-dacff0c0f09a')],
    description: 'Home to three UNESCO World Heritage sites and one of the world’s best-known monuments. Agra is usually explored as a focused heritage weekend.',
    highlights: ['Taj Mahal', 'Agra Fort', 'Fatehpur Sikri', 'Mehtab Bagh', 'Petha market'],
    tags: ['UNESCO', 'History', 'Weekend'], coords: { lat: 27.1767, lng: 78.0081 }, idealDays: 2, avgDailyINR: 2400,
  },
  {
    id: 'rishikesh', name: 'Rishikesh', city: 'Rishikesh', country: 'India', region: 'Uttarakhand', category: 'adventure',
    image: photo('photo-1501785888041-af3ef285b470'),
    gallery: [photo('photo-1476514525535-07fb3b4ae5f1'), photo('photo-1464822759023-fed622ff2c3b')],
    description: 'A riverside town at the edge of the Himalayas, known for yoga, ashrams and white-water rafting on the Ganges.',
    highlights: ['Laxman Jhula', 'River rafting', 'Beatles Ashram', 'Triveni Ghat', 'Yoga retreats'],
    tags: ['Yoga', 'Rafting', 'Spiritual'], coords: { lat: 30.0869, lng: 78.2676 }, idealDays: 3, avgDailyINR: 2300,
  },
  {
    id: 'ladakh', name: 'Ladakh', city: 'Leh', country: 'India', region: 'Ladakh', category: 'adventure',
    image: photo('photo-1506905925346-21bda4d32df4'),
    gallery: [photo('photo-1464822759023-fed622ff2c3b'), photo('photo-1500534623283-312aade485b7')],
    description: 'High-altitude desert, Buddhist monasteries and some of the most dramatic mountain roads in the world. Best planned with acclimatisation time.',
    highlights: ['Pangong Lake', 'Nubra Valley', 'Thiksey Monastery', 'Khardung La', 'Magnetic Hill'],
    tags: ['High altitude', 'Road trip', 'Monasteries'], coords: { lat: 34.1526, lng: 77.5771 }, idealDays: 7, avgDailyINR: 3800,
  },
  {
    id: 'pondicherry', name: 'Pondicherry', city: 'Puducherry', country: 'India', region: 'Puducherry', category: 'culture',
    image: photo('photo-1533105079780-92b9be482077'),
    gallery: [photo('photo-1519046904884-53103b34b206'), photo('photo-1523906834658-6e24ef2386f9')],
    description: 'French colonial streets, Tamil heritage and a slow coastal rhythm. Compact enough to explore on foot or by bicycle over a long weekend.',
    highlights: ['French Quarter', 'Promenade Beach', 'Aurobindo Ashram', 'Auroville', 'Boulangeries'],
    tags: ['Weekend', 'Food', 'Heritage'], coords: { lat: 11.9416, lng: 79.8083 }, idealDays: 3, avgDailyINR: 2600,
  },
  {
    id: 'hampi', name: 'Hampi', city: 'Hampi', country: 'India', region: 'Karnataka', category: 'history',
    image: photo('photo-1548013146-72479768bada'),
    gallery: [photo('photo-1524492412937-b28074a5d7da'), photo('photo-1500534623283-312aade485b7')],
    description: 'A vast ruined city of the Vijayanagara empire, scattered across boulder-strewn landscape. Hampi rewards slow wandering and sunset viewpoints.',
    highlights: ['Virupaksha Temple', 'Stone Chariot', 'Hampi Bazaar', 'Matanga Hill', 'Coracle rides'],
    tags: ['UNESCO', 'History', 'Budget'], coords: { lat: 15.335, lng: 76.46 }, idealDays: 3, avgDailyINR: 2000,
  },
  {
    id: 'bali', name: 'Bali', city: 'Denpasar', country: 'Indonesia', region: 'Bali', category: 'beach',
    image: photo('photo-1537996194471-e657df975ab4'),
    gallery: [photo('photo-1507525428034-b723cf961d3e'), photo('photo-1533105079780-92b9be482077')],
    description: 'Volcanic highlands, temple ceremonies and a long surf coast. Bali suits both a relaxed beach stay and an active sightseeing itinerary.',
    highlights: ['Ubud', 'Tirta Empul', 'Uluwatu Temple', 'Rice terraces', 'Seminyak Beach'],
    tags: ['Island', 'Culture', 'Surf'], coords: { lat: -8.4095, lng: 115.1889 }, idealDays: 6, avgDailyINR: 5200,
  },
  {
    id: 'santorini', name: 'Santorini', city: 'Thira', country: 'Greece', region: 'South Aegean', category: 'beach',
    image: photo('photo-1533105079780-92b9be482077'),
    gallery: [photo('photo-1523906834658-6e24ef2386f9'), photo('photo-1507525428034-b723cf961d3e')],
    description: 'A volcanic caldera with whitewashed cliffside villages and clear Aegean water. Best experienced with unhurried sunsets and long lunches.',
    highlights: ['Oia', 'Fira', 'Akrotiri', 'Red Beach', 'Caldera cruise'],
    tags: ['Island', 'Romance', 'Photography'], coords: { lat: 36.4618, lng: 25.3753 }, idealDays: 5, avgDailyINR: 11000,
  },
  {
    id: 'kyoto', name: 'Kyoto', city: 'Kyoto', country: 'Japan', region: 'Kansai', category: 'culture',
    image: photo('photo-1493976040374-85c8e12f0c0e'),
    gallery: [photo('photo-1528360983277-13d401cdc186'), photo('photo-1545569341-9eb8b30979d9')],
    description: 'Japan’s former capital, with thousands of temples, traditional districts and a famously careful seasonal rhythm of cherry blossom and autumn colour.',
    highlights: ['Fushimi Inari', 'Kiyomizu-dera', 'Arashiyama', 'Gion', 'Nishiki Market'],
    tags: ['Temples', 'Food', 'Seasons'], coords: { lat: 35.0116, lng: 135.7681 }, idealDays: 5, avgDailyINR: 9000,
  },
  {
    id: 'dubai', name: 'Dubai', city: 'Dubai', country: 'United Arab Emirates', region: 'Dubai', category: 'culture',
    image: photo('photo-1512453979798-5ea266f8880c'),
    gallery: [photo('photo-1518684079-3c830dcef090'), photo('photo-1523906834658-6e24ef2386f9')],
    description: 'A modern desert city of ambitious architecture, museum projects and a large, varied food scene. Distinct Old Dubai and Downtown districts.',
    highlights: ['Burj Khalifa', 'Dubai Museum', 'Al Fahidi', 'Dubai Mall', 'Desert safari'],
    tags: ['City', 'Architecture', 'Shopping'], coords: { lat: 25.2048, lng: 55.2708 }, idealDays: 4, avgDailyINR: 9500,
  },
  {
    id: 'queenstown', name: 'Queenstown', city: 'Queenstown', country: 'New Zealand', region: 'Otago', category: 'adventure',
    image: photo('photo-1469474968028-56623f02e42e'),
    gallery: [photo('photo-1476514525535-07fb3b4ae5f1'), photo('photo-1500534623283-312aade485b7')],
    description: 'An alpine lakeside town built around outdoor activity — hiking, skiing, rafting and a well-developed network of scenic routes.',
    highlights: ['Milford Sound', 'Skyline Gondola', 'Lake Wakatipu', 'Routeburn Track', 'Kawarau rafting'],
    tags: ['Adventure', 'Alpine', 'Hiking'], coords: { lat: -45.0312, lng: 168.6626 }, idealDays: 7, avgDailyINR: 12000,
  },
  {
    id: 'paris', name: 'Paris', city: 'Paris', country: 'France', region: 'Île-de-France', category: 'history',
    image: photo('photo-1499856871958-5b9627545d1a'),
    gallery: [photo('photo-1502602898657-3e91760cbb34'), photo('photo-1523906834658-6e24ef2386f9')],
    description: 'A dense walkable city of museums, boulevards and neighbourhood markets. Best planned by district rather than by trying to cover everything at once.',
    highlights: ['Louvre', 'Eiffel Tower', 'Montmartre', 'Sainte-Chapelle', 'Le Marais'],
    tags: ['Art', 'Food', 'City'], coords: { lat: 48.8566, lng: 2.3522 }, idealDays: 5, avgDailyINR: 11000,
  },
  {
    id: 'coorg', name: 'Coorg', city: 'Madikeri', country: 'India', region: 'Karnataka', category: 'mountain',
    image: photo('photo-1441974231531-c6227db76b6e'),
    gallery: [photo('photo-1439066615861-d1af74d74000'), photo('photo-1500534623283-312aade485b7')],
    description: 'Coffee estates and forested hills in the Western Ghats. A good short break for nature drives, plantation stays and easy treks.',
    highlights: ['Abbey Falls', 'Raja’s Seat', 'Coffee plantations', 'Dubare Forest', 'Tadiandamol'],
    tags: ['Coffee', 'Nature', 'Weekend'], coords: { lat: 12.4244, lng: 75.7382 }, idealDays: 3, avgDailyINR: 2500,
  },
];

export const getDestination = (id) => destinations.find((d) => d.id === id);

export function searchDestinations({ query = '', category = 'all', country = 'all', city = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  return destinations.filter((d) => {
    if (category !== 'all' && d.category !== category) return false;
    if (country !== 'all' && d.country !== country) return false;
    if (city !== 'all' && d.city !== city) return false;
    if (!q) return true;
    return [d.name, d.city, d.country, d.region, ...d.tags, ...d.highlights]
      .join(' ').toLowerCase().includes(q);
  });
}

export const countries = ['all', ...Array.from(new Set(destinations.map((d) => d.country)))];
export const cities = ['all', ...Array.from(new Set(destinations.map((d) => d.city)))];

export const categoryLabel = (id) => categories.find((c) => c.id === id)?.label ?? id;

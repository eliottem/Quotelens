/* Shared multi-project data — projects, suppliers, usage map */

const PROJECTS_DB = [
  {
    id: 'sprks',
    name: 'SPRKS Gift Set Q3',
    code: 'SPK',
    industry: 'Cosmetics',
    color: '#6EE7B7',
    status: 'active',
    stages: 5,
    suppliers: ['rifeshow', 'kraftwerk', 'parmaz', 'flexship', 'vetro'],
    units: '10,000',
    cost: '$9.12',
    margin: 81.8,
    updated: '2 hours ago',
    scenarios: 3,
  },
  {
    id: 'typologie',
    name: 'Typologie Refill Line',
    code: 'TYP',
    industry: 'Cosmetics',
    color: '#A78BFA',
    status: 'active',
    stages: 4,
    suppliers: ['rifeshow', 'vetro', 'parmaz', 'flexship'],
    units: '25,000',
    cost: '$6.84',
    margin: 76.4,
    updated: 'Yesterday',
    scenarios: 2,
  },
  {
    id: 'orso',
    name: 'Orso Holiday Hamper',
    code: 'ORS',
    industry: 'Food & Beverage',
    color: '#FBBF24',
    status: 'draft',
    stages: 6,
    suppliers: ['kraftwerk', 'flexship', 'tavola'],
    units: '4,500',
    cost: '$22.10',
    margin: 58.1,
    updated: '3 days ago',
    scenarios: 1,
  },
  {
    id: 'fete',
    name: 'Fête Q1 Activation',
    code: 'FET',
    industry: 'Events',
    color: '#60A5FA',
    status: 'archived',
    stages: 3,
    suppliers: ['kraftwerk', 'maison'],
    units: '800',
    cost: '$48.20',
    margin: 42.7,
    updated: '6 weeks ago',
    scenarios: 4,
  },
];

const SUPPLIERS_DB = [
  { id: 'rifeshow', name: 'Rifeshow Packaging', city: 'Yiwu', country: 'CN', contact: 'Lin Wei', docs: 3, status: 'parsed', updated: '2 hours ago', stage: 'Primary Packaging', usedIn: ['sprks', 'typologie'], rating: 4.6, avgLead: '8w' },
  { id: 'vetro', name: 'Vetro Cristallino', city: 'Murano', country: 'IT', contact: 'Giulia Conti', docs: 2, status: 'parsed', updated: 'Yesterday', stage: 'Primary Packaging', usedIn: ['sprks', 'typologie'], rating: 4.9, avgLead: '10w' },
  { id: 'parmaz', name: 'Parmaz Industries', city: 'Lisbon', country: 'PT', contact: 'João Ferreira', docs: 4, status: 'parsed', updated: '4 days ago', stage: 'Filling & Assembly', usedIn: ['sprks', 'typologie'], rating: 4.7, avgLead: '6w' },
  { id: 'kraftwerk', name: 'Kraftwerk Print Co.', city: 'Stuttgart', country: 'DE', contact: 'Anna Voss', docs: 2, status: 'processing', updated: '12 minutes ago', stage: 'Secondary Packaging', usedIn: ['sprks', 'orso', 'fete'], rating: 4.4, avgLead: '4w' },
  { id: 'maison', name: 'Maison Atelier', city: 'Lyon', country: 'FR', contact: 'Camille Dubois', docs: 1, status: 'review', updated: '6 hours ago', stage: 'Secondary Packaging', usedIn: ['fete'], rating: 4.2, avgLead: '5w' },
  { id: 'flexship', name: 'Flexship Logistics', city: 'Rotterdam', country: 'GB', contact: 'Owen Hartley', docs: 3, status: 'parsed', updated: '3 days ago', stage: 'Freight', usedIn: ['sprks', 'typologie', 'orso'], rating: 4.5, avgLead: '1w' },
  { id: 'tavola', name: 'Tavola Foods', city: 'Bologna', country: 'IT', contact: 'Marco Ricci', docs: 2, status: 'parsed', updated: '1 week ago', stage: 'Filling & Assembly', usedIn: ['orso'], rating: 4.3, avgLead: '7w' },
];

const projectById = (id) => PROJECTS_DB.find(p => p.id === id);
const supplierById = (id) => SUPPLIERS_DB.find(s => s.id === id);

window.PROJECTS_DB = PROJECTS_DB;
window.SUPPLIERS_DB = SUPPLIERS_DB;
window.projectById = projectById;
window.supplierById = supplierById;

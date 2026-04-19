const NODE_TYPES = {
  home: {
    displayName: 'Home',
    security: 0,
    resources: { cpu: 0, ram: 0, gpu: 0 },
    bleedPerSec: 0,
    hackScript: null,
    bleedScript: null,
  },
  pc: {
    displayName: 'Workstation',
    security: 1,
    resources: { cpu: 2, ram: 4, gpu: 0 },
    bleedPerSec: 0,
    hackScript: null,
    bleedScript: null,
  },
  server: {
    displayName: 'Server',
    security: 2,
    resources: { cpu: 4, ram: 8, gpu: 2 },
    bleedPerSec: 0,
    hackScript: null,
    bleedScript: null,
  },
  company: {
    displayName: 'Corp Server',
    security: 3,
    resources: { cpu: 8, ram: 16, gpu: 4 },
    bleedPerSec: 3.5,
    hackScript: null,
    bleedScript: 'corp_bleeder',
  },
};

const HACK_DURATIONS = { pc: 20, server: 45, company: 90 };

// Port recon system
const PORT_TYPES = ['ssh', 'http', 'ftp', 'rdp', 'sql', 'smb'];

const NODE_PORT_CONFIG = {
  pc:      { total: 3,  open: 1 },
  server:  { total: 6,  open: 1 },
  company: { total: 10, open: 2 },
};

// Port type colors for UI
const PORT_COLORS = {
  ssh:  '#4ade80',
  http: '#5b9cf6',
  ftp:  '#a78bfa',
  rdp:  '#fb923c',
  sql:  '#f59e0b',
  smb:  '#f87171',
};

// Port pools per node type — determines which ports can appear
const NODE_PORT_POOLS = {
  pc:      ['ssh', 'http', 'ftp', 'rdp'],
  server:  ['http', 'ftp', 'sql', 'ssh', 'rdp'],
  company: ['ssh', 'http', 'ftp', 'rdp', 'sql', 'smb'],
};

// Map layout: rings of nodes
const MAP_RINGS = [
  { count: 1, pool: ['home']                                                                     },
  { count: 4, pool: ['pc','pc','pc','server']                                                    },
  { count: 7, pool: ['pc','pc','pc','server','server','server','pc']                             },
  { count: 8, pool: ['server','server','server','server','company','company','pc','server']      },
  { count: 5, pool: ['company','company','server','company','server']                            },
];

const MAP_RING_RADII = [0, 95, 185, 270, 350];
const MAP_CENTER     = { x: 430, y: 330 };

// Label generation
const _LABEL_POOLS = {
  pc:      ['WRKSTN','DESK','NODE','LPTOP','PC'],
  server:  ['SRV','HOST','SVR','RACK','BOX'],
  company: ['CORP','ENT','PROD','SYS','INFRA'],
};

function makeNodeLabel(type) {
  if (type === 'home') return 'HOME';
  const pool = _LABEL_POOLS[type] || ['NODE'];
  const prefix = pool[Math.floor(Math.random() * pool.length)];
  const hex    = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return `${prefix}-${hex}`;
}

export const VALUE_TYPES = {
  'INTEGER': {
    type: 'number',
    parse: parseInt,
  },
  'STRING': {
    type: 'string',
    parse: (x) => x,
  },
  'BOOLEAN': {
    type: 'boolean',
    parse: (x) => x.toLowerCase() === 'true'
  },
  'FLOAT': {
    type: 'float',
    parse: parseFloat,
  },
};

export const LOT_TYPES = ['CAR', 'MOTOR', 'HEAVY VEHICLE'];

export const LOT_DIMENSIONS = {
  CAR: {
    VERTICAL: {
      WIDTH: 2.4,
      LENGTH: 4.8,
    },
  
    PARALLEL: {
      WIDTH: 2.4,
      LENGTH: 5.4
    }
  },
};
export const treasuryABI = [
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { type: 'address', name: 'user', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { type: 'address', name: 'user', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Executed',
    inputs: [
      { type: 'address', name: 'target', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
      { type: 'bytes', name: 'data', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ManagerUpdated',
    inputs: [
      { type: 'address', name: 'manager', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [
      { type: 'bool', name: 'paused', indexed: false },
    ],
  },
] as const;

import { depositorsResponseSchema } from '@/depositors-list/queries/use-depositors-query';

const depositorsMockRaw = {
  depositors: [
    {
      address: '0xd1621a7040cd9d0be444ef07621bead1c1166ad4',
      shareBalance: '20063650032768',
      firstActivity: 1746635015,
      lastActivity: 1746635015,
    },
    {
      address: '0x101ded8dec510217a437d4def7d8f4df59fddb6b',
      shareBalance: '18945844600307',
      firstActivity: 1748033809,
      lastActivity: 1748643137,
    },
    {
      address: '0x9ebaff2192d2746fec76561bdf72fd249d7a73ab',
      shareBalance: '18238569441079',
      firstActivity: 1745541195,
      lastActivity: 1751954457,
    },
    {
      address: '0xa8c49995efdcad8764e5e6ae1d56c4038cc00568',
      shareBalance: '17116212793505',
      firstActivity: 1752252559,
      lastActivity: 1752252559,
    },
    {
      address: '0xeed339990e56ac554215ae9e1aa8d81a6e40b84b',
      shareBalance: '16670293517228',
      firstActivity: 1745647049,
      lastActivity: 1745647049,
    },
    {
      address: '0xf1acac7509de69ad6e45306b97849a73da54d957',
      shareBalance: '15008062246420',
      firstActivity: 1747581839,
      lastActivity: 1752416747,
    },
    {
      address: '0x4f4366b13d499b4248b084a4c3f00ad960c53ea0',
      shareBalance: '14797913444508',
      firstActivity: 1747121115,
      lastActivity: 1747121115,
    },
    {
      address: '0xcf789cea4a323d1f2072fe5bd469fb012a5bd5b9',
      shareBalance: '12581004881774',
      firstActivity: 1754047169,
      lastActivity: 1754047721,
    },
    {
      address: '0xa16eec8476d15caf3908a0eef9458a79908f15b5',
      shareBalance: '10381787600124',
      firstActivity: 1746817063,
      lastActivity: 1746889785,
    },
    {
      address: '0xa42d252130820854776c41c83956e59dba6d32a9',
      shareBalance: '7756758963010',
      firstActivity: 1745743359,
      lastActivity: 1753355607,
    },
    {
      address: '0x021f0b20da3b0471c175fbc85ed5c09055fec061',
      shareBalance: '6580879177344',
      firstActivity: 1753223791,
      lastActivity: 1754111607,
    },
    {
      address: '0x2e5eb9a4e6190ff80ccd24fe2eeb4da33808d79c',
      shareBalance: '6556847971817',
      firstActivity: 1746221015,
      lastActivity: 1752120679,
    },
    {
      address: '0x667c0d685641d271cdfb550139cf146b81b50910',
      shareBalance: '4962397087865',
      firstActivity: 1749763029,
      lastActivity: 1749763029,
    },
    {
      address: '0x099dc70987810080ac1671b2fbafff93abf77b33',
      shareBalance: '4902178246325',
      firstActivity: 1745486717,
      lastActivity: 1753451419,
    },
    {
      address: '0xcc5f8582114f7dcdf79e0cd7109d93c29422d22f',
      shareBalance: '4843621429348',
      firstActivity: 1747006341,
      lastActivity: 1754002471,
    },
    {
      address: '0x87333e15b593e13d22ceb38046f3dee0b964ef37',
      shareBalance: '4659324965477',
      firstActivity: 1745445465,
      lastActivity: 1745445465,
    },
    {
      address: '0x3b5b0e94efa22287ed2d43d1a842ca5495263352',
      shareBalance: '4543776656147',
      firstActivity: 1745484477,
      lastActivity: 1745484477,
    },
    {
      address: '0xf6cd36e78dc2fa62453478c64bd8e50d538a5c9e',
      shareBalance: '4364761892202',
      firstActivity: 1745539483,
      lastActivity: 1746478449,
    },
    {
      address: '0x79606d76b73ea9f1c5e1b8ff18cf02d3b8340758',
      shareBalance: '4361545285966',
      firstActivity: 1749375775,
      lastActivity: 1749375775,
    },
    {
      address: '0x56a8b25d1c8f69cc396c5982ea04d88822092811',
      shareBalance: '3658878295648',
      firstActivity: 1752405471,
      lastActivity: 1752600999,
    },
  ],
  pagination: {
    currentPage: 1,
    totalPages: 23,
    totalCount: 442,
    hasNext: true,
    hasPrevious: false,
    limit: 20,
  },
};

export const depositorsMock = depositorsResponseSchema.parse(depositorsMockRaw);

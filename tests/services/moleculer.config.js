// require('dotenv').config({ override: true });

module.exports = {
  namespace: 'test-nmw',
  nodeID: 'TEST',
  transporter: 'TCP',
  registry: {
    strategy: 'RoundRobin',
    preferLocal: false,
  },
  logger: console,
  metrics: {
    enabled: false,
    reporter: [
      "Console"
    ]
  }
};

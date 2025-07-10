// require('dotenv').config({ override: true });

module.exports = {
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

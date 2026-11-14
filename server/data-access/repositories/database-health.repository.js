const { connection, STATES } = require('mongoose');

let probe;

const isDatabaseReady = () => {
  if (connection.readyState !== STATES.connected || !connection.db) return false;
  // Concurrent readiness requests share one short, primary-directed ping.
  if (!probe) {
    probe = connection.db.command({ ping: 1 }, { timeoutMS: 2_000, readPreference: 'primary' })
      .then(() => true, () => false)
      .finally(() => { probe = undefined; });
  }
  return probe;
};

module.exports = { isDatabaseReady };

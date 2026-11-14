const { Router } = require('express');

const createHealthRoutes = isDatabaseReady => {
  const router = Router();
  router.get('/readyz', async (req, res) => {
    const ready = await isDatabaseReady();
    return res.set('Cache-Control', 'no-store')
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'unavailable' });
  });
  return router;
};

module.exports = { createHealthRoutes };

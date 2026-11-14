const getJwtSecret = (env = process.env) => {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.trim().length < 32 || /your_jwt_secret|fallback_secret/i.test(secret)) {
    throw new Error('JWT_SECRET must be a unique secret of at least 32 characters.');
  }
  return secret;
};

const getAllowedOrigins = (env = process.env) => {
  const configured = [env.CLIENT_URL || '', ...(env.CLIENT_ORIGINS || '').split(',')].map(value => value.trim()).filter(Boolean);
  if (env.NODE_ENV === 'production' && !env.CLIENT_URL?.trim()) {
    throw new Error('CLIENT_URL must specify the frontend origin in production.');
  }
  const origins = configured.map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('CLIENT_URL entries must be HTTP(S) origins without paths or credentials.');
    }
    return url.origin;
  });
  if (env.NODE_ENV !== 'production') origins.push('http://localhost:5173', 'http://localhost:5174');
  return [...new Set(origins)];
};

const isAllowedOrigin = (origin, allowedOrigins) => !origin || allowedOrigins.includes(origin);

const getTrustedProxyHops = (env = process.env) => {
  const value = env.TRUST_PROXY_HOPS?.trim() || '0';
  if (!/^[0-5]$/.test(value)) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5.');
  }
  return Number(value) || false;
};

module.exports = { getJwtSecret, getAllowedOrigins, isAllowedOrigin, getTrustedProxyHops };

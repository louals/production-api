import aj from "#config/arcjet.js"
import logger from "#config/logger.js"
import { slidingWindow } from '@arcjet/node'

const securityMiddleware = async (req, res, next) => {
    try {
        const role = req.user?.role || 'guest'
    let limit;
    let message;

    switch (role) {
      case 'admin':
        limit = 20
        message = "Admin request limit exceeded (20 per minute). Slow down"
        break;
      case 'user':
        limit = 10
        message = "User request limit exceeded (10 per minute). Slow down"
        break;
      default:
        limit = 5
        message = "Guest request limit exceeded (5 per minute). Slow down"
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    )

    const decision = await client.protect(req)

    if (decision.isDenied()) {
      logger.warn('Request denied', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        reason: decision.reason.type,
      })

      if (
        decision.reason.isBot() ||
        decision.reason.isShield()
      ) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Automated requests are not allowed',
        })
      }

      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: 'Too many requests',
          message,
        })
      }
    }

    return next()
    } catch (e) {
        console.error('Arcjet middleware error:', e);
        res.status(500).json({ error: 'Internal server error', message: 'Something went wrong with security middleware' })
    }
}
export default securityMiddleware
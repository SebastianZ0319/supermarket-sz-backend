const crypto = require('crypto')

// Protege las rutas de administración con la clave ADMIN_KEY del .env
function soloAdmin(req, res, next) {
    const esperada = process.env.ADMIN_KEY
    const recibida = req.get('x-admin-key') ?? ''

    if (!esperada) {
        return res.status(500).json({ error: 'ADMIN_KEY no está configurada en el servidor' })
    }

    const a = Buffer.from(recibida)
    const b = Buffer.from(esperada)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Clave de administrador inválida' })
    }

    next()
}

module.exports = soloAdmin

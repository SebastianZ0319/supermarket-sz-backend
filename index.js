require('dotenv').config({ quiet: true })
const express = require('express')
const cors = require('cors')
const pool = require('./db')
const rutasProductos = require('./rutas/productos')
const rutasPedidos = require('./rutas/pedidos')
const soloAdmin = require('./middleware/admin')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('¡El servidor está funcionando!')
})

app.use('/productos', rutasProductos)
app.use('/pedidos', rutasPedidos)

// Permite al panel comprobar si la clave es correcta
app.get('/admin/verificar', soloAdmin, (req, res) => {
    res.json({ ok: true })
})

// Express 5 envía aquí los errores de las rutas async
app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
})

const PUERTO = process.env.PORT || 3000

pool.query('SELECT 1')
    .then(() => console.log('Conectado a MySQL correctamente'))
    .catch((error) => console.error('Error al conectar a MySQL:', error.message))

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`)
})

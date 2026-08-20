const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('¡El servidor está funcionando!')
})

const conexion = require('./db')
app.get('/productos', (req, res) => {
    conexion.query('SELECT * FROM productos', (error, resultados) => {
        if (error) {
            res.status(500).json({ error: 'Error al obtener productos' })
        } else {
            res.json(resultados)
        }
    })
})

const PUERTO = 3000
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`)
})



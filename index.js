const express = require('express')
const cors = require('cors')
const conexion = require('./db')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('¡El servidor está funcionando!')
})

app.get('/productos', (req, res) => {
    conexion.query('SELECT * FROM productos', (error, resultados) => {
        if (error) {
            res.status(500).json({ error: 'Error al obtener productos' })
        } else {
            res.json(resultados)
        }
    })
})

app.put('/productos/:id', (req, res) => {
    const id = req.params.id
    const nuevoStock = req.body.stock

    conexion.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, id], (error, resultado) => {
        if (error) {
            res.status(500).json({ error: 'Error al actualizar stock' })
        } else {
            res.json({ mensaje: 'Stock actualizado' })
        }
    })
})

const PUERTO = 3000
app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`)
})
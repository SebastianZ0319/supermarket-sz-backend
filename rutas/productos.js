const express = require('express')
const pool = require('../db')
const soloAdmin = require('../middleware/admin')
const { validarProducto } = require('../validaciones')

const router = express.Router()

const COLUMNAS = `id, nombre, precio, stock, imagen, categoria, descripcion,
    precio_anterior AS precioAnterior`

router.get('/', async (req, res) => {
    const [productos] = await pool.query(`SELECT ${COLUMNAS} FROM productos ORDER BY id`)
    res.json(productos)
})

router.get('/:id', async (req, res) => {
    const [[producto]] = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [req.params.id])
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(producto)
})

router.post('/', soloAdmin, async (req, res) => {
    const { datos, errores, valido } = validarProducto(req.body)
    if (!valido) return res.status(400).json({ error: 'Datos inválidos', errores })

    const [resultado] = await pool.query('INSERT INTO productos SET ?', [datos])
    const [[producto]] = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [resultado.insertId])
    res.status(201).json(producto)
})

router.put('/:id', soloAdmin, async (req, res) => {
    const { datos, errores, valido } = validarProducto(req.body, { parcial: true })
    if (!valido) return res.status(400).json({ error: 'Datos inválidos', errores })

    const [resultado] = await pool.query('UPDATE productos SET ? WHERE id = ?', [datos, req.params.id])
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' })

    const [[producto]] = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [req.params.id])
    res.json(producto)
})

router.delete('/:id', soloAdmin, async (req, res) => {
    // Los pedidos guardan nombre y precio, así que el historial no se pierde
    const [resultado] = await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id])
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' })
    res.status(204).end()
})

module.exports = router

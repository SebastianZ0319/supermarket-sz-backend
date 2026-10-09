const express = require('express')
const pool = require('../db')
const soloAdmin = require('../middleware/admin')
const { validarPedido, calcularTotales, ESTADOS_PEDIDO } = require('../validaciones')

const router = express.Router()

async function obtenerPedido(conexion, id) {
    const [[pedido]] = await conexion.query(
        `SELECT id, cliente_nombre AS nombre, telefono, direccion, notas, metodo_pago AS metodoPago,
            subtotal, envio, total, estado, creado_en AS creadoEn
         FROM pedidos WHERE id = ?`,
        [id]
    )
    if (!pedido) return null
    const [items] = await conexion.query(
        'SELECT producto_id AS id, nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?',
        [id]
    )
    return { ...pedido, items }
}

// Crear pedido: valida stock y lo descuenta en una sola transacción
router.post('/', async (req, res) => {
    const { datos, errores, valido } = validarPedido(req.body)
    if (!valido) return res.status(400).json({ error: 'Datos inválidos', errores })

    const conexion = await pool.getConnection()
    try {
        await conexion.beginTransaction()

        // FOR UPDATE bloquea las filas para que dos compras simultáneas no vendan el mismo stock
        const ids = datos.items.map((i) => i.id)
        const [productos] = await conexion.query(
            'SELECT id, nombre, precio, stock FROM productos WHERE id IN (?) FOR UPDATE',
            [ids]
        )
        const porId = new Map(productos.map((p) => [p.id, p]))

        const faltantes = datos.items
            .filter((item) => (porId.get(item.id)?.stock ?? 0) < item.cantidad)
            .map((item) => ({
                id: item.id,
                nombre: porId.get(item.id)?.nombre ?? 'Producto no disponible',
                disponible: porId.get(item.id)?.stock ?? 0,
                solicitado: item.cantidad,
            }))

        if (faltantes.length > 0) {
            await conexion.rollback()
            return res.status(409).json({ error: 'No hay stock suficiente', faltantes })
        }

        // Los precios salen de la base de datos, nunca del cliente
        const lineas = datos.items.map((item) => {
            const p = porId.get(item.id)
            return { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: item.cantidad }
        })
        const { subtotal, envio, total } = calcularTotales(lineas)

        const [resultado] = await conexion.query('INSERT INTO pedidos SET ?', [
            {
                cliente_nombre: datos.cliente.nombre,
                telefono: datos.cliente.telefono,
                direccion: datos.cliente.direccion,
                notas: datos.cliente.notas,
                metodo_pago: datos.metodoPago,
                subtotal,
                envio,
                total,
            },
        ])
        const pedidoId = resultado.insertId

        await conexion.query('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES ?', [
            lineas.map((l) => [pedidoId, l.id, l.nombre, l.precio, l.cantidad]),
        ])

        for (const l of lineas) {
            await conexion.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [l.cantidad, l.id])
        }

        await conexion.commit()
        res.status(201).json(await obtenerPedido(conexion, pedidoId))
    } catch (error) {
        await conexion.rollback()
        throw error
    } finally {
        conexion.release()
    }
})

router.get('/', soloAdmin, async (req, res) => {
    const [pedidos] = await pool.query('SELECT id FROM pedidos ORDER BY id DESC LIMIT 100')
    res.json(await Promise.all(pedidos.map((p) => obtenerPedido(pool, p.id))))
})

// Cambiar estado; al cancelar se devuelve el stock
router.patch('/:id', soloAdmin, async (req, res) => {
    const { estado } = req.body ?? {}
    if (!ESTADOS_PEDIDO.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Usa: ${ESTADOS_PEDIDO.join(', ')}` })
    }

    const conexion = await pool.getConnection()
    try {
        await conexion.beginTransaction()
        const [[pedido]] = await conexion.query('SELECT estado FROM pedidos WHERE id = ? FOR UPDATE', [req.params.id])
        if (!pedido) {
            await conexion.rollback()
            return res.status(404).json({ error: 'Pedido no encontrado' })
        }
        if (pedido.estado === 'cancelado') {
            await conexion.rollback()
            return res.status(409).json({ error: 'Un pedido cancelado no se puede modificar' })
        }

        if (estado === 'cancelado') {
            await conexion.query(
                `UPDATE productos p JOIN pedido_items i ON i.producto_id = p.id
                 SET p.stock = p.stock + i.cantidad WHERE i.pedido_id = ?`,
                [req.params.id]
            )
        }
        await conexion.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id])
        await conexion.commit()
        res.json(await obtenerPedido(conexion, req.params.id))
    } catch (error) {
        await conexion.rollback()
        throw error
    } finally {
        conexion.release()
    }
})

module.exports = router

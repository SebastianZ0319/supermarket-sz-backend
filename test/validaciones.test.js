const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validarProducto, validarPedido, calcularTotales, COSTO_ENVIO } = require('../validaciones')

const pedidoValido = {
    cliente: { nombre: 'Ana Pérez', telefono: '300 123 4567', direccion: 'Calle 10 # 20-30' },
    metodoPago: 'efectivo',
    items: [{ id: 1, cantidad: 2 }],
}

test('producto válido completo', () => {
    const r = validarProducto({ nombre: ' Leche ', precio: 5000, stock: 3 })
    assert.equal(r.valido, true)
    assert.equal(r.datos.nombre, 'Leche')
})

test('rechaza stock negativo y precio cero', () => {
    const r = validarProducto({ nombre: 'Leche', precio: 0, stock: -1 })
    assert.equal(r.valido, false)
    assert.ok(r.errores.precio)
    assert.ok(r.errores.stock)
})

test('actualización parcial solo valida lo enviado', () => {
    const r = validarProducto({ stock: 10 }, { parcial: true })
    assert.equal(r.valido, true)
    assert.deepEqual(r.datos, { stock: 10 })
})

test('actualización parcial vacía es inválida', () => {
    assert.equal(validarProducto({}, { parcial: true }).valido, false)
})

test('precio anterior debe ser mayor al precio', () => {
    assert.equal(validarProducto({ nombre: 'A', precio: 5000, stock: 1, precioAnterior: 4000 }).valido, false)
    assert.equal(validarProducto({ nombre: 'A', precio: 5000, stock: 1, precioAnterior: 6000 }).valido, true)
})

test('pedido válido normaliza teléfono', () => {
    const r = validarPedido(pedidoValido)
    assert.equal(r.valido, true)
    assert.equal(r.datos.cliente.telefono, '3001234567')
})

test('pedido junta productos repetidos', () => {
    const r = validarPedido({ ...pedidoValido, items: [{ id: 1, cantidad: 1 }, { id: 1, cantidad: 2 }] })
    assert.deepEqual(r.datos.items, [{ id: 1, cantidad: 3 }])
})

test('pedido rechaza carrito vacío, cantidades inválidas y método desconocido', () => {
    assert.ok(validarPedido({ ...pedidoValido, items: [] }).errores.items)
    assert.ok(validarPedido({ ...pedidoValido, items: [{ id: 1, cantidad: 0 }] }).errores.items)
    assert.ok(validarPedido({ ...pedidoValido, metodoPago: 'bitcoin' }).errores.metodoPago)
})

test('envío gratis desde el umbral', () => {
    assert.deepEqual(calcularTotales([{ precio: 10000, cantidad: 1 }]), {
        subtotal: 10000,
        envio: COSTO_ENVIO,
        total: 10000 + COSTO_ENVIO,
    })
    assert.equal(calcularTotales([{ precio: 25000, cantidad: 2 }]).envio, 0)
})

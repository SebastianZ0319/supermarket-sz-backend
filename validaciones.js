// Reglas de negocio puras (sin base de datos) para poder probarlas fácilmente

// Deben coincidir con src/utils/tienda.js del frontend
const ENVIO_GRATIS_DESDE = 50000
const COSTO_ENVIO = 5000

const METODOS_PAGO = ['efectivo', 'datafono', 'transferencia']
const ESTADOS_PEDIDO = ['pendiente', 'enviado', 'entregado', 'cancelado']

function esEnteroNoNegativo(valor) {
    return Number.isInteger(valor) && valor >= 0
}

function textoLimpio(valor) {
    return typeof valor === 'string' ? valor.trim() : ''
}

// parcial = true permite enviar solo algunos campos (para PUT)
function validarProducto(body, { parcial = false } = {}) {
    const datos = {}
    const errores = {}
    const presente = (campo) => body[campo] !== undefined

    if (!parcial || presente('nombre')) {
        const nombre = textoLimpio(body.nombre)
        if (!nombre) errores.nombre = 'El nombre es obligatorio'
        else if (nombre.length > 100) errores.nombre = 'Máximo 100 caracteres'
        else datos.nombre = nombre
    }

    if (!parcial || presente('precio')) {
        if (!Number.isInteger(body.precio) || body.precio <= 0) errores.precio = 'El precio debe ser un entero mayor a 0'
        else datos.precio = body.precio
    }

    if (!parcial || presente('stock')) {
        if (!esEnteroNoNegativo(body.stock)) errores.stock = 'El stock debe ser un entero mayor o igual a 0'
        else datos.stock = body.stock
    }

    if (presente('imagen')) {
        const imagen = textoLimpio(body.imagen)
        if (imagen.length > 255) errores.imagen = 'Máximo 255 caracteres'
        else datos.imagen = imagen || null
    }

    if (presente('categoria')) {
        const categoria = textoLimpio(body.categoria)
        if (categoria.length > 50) errores.categoria = 'Máximo 50 caracteres'
        else datos.categoria = categoria || null
    }

    if (presente('descripcion')) {
        const descripcion = textoLimpio(body.descripcion)
        if (descripcion.length > 1000) errores.descripcion = 'Máximo 1000 caracteres'
        else datos.descripcion = descripcion || null
    }

    if (presente('precioAnterior')) {
        if (body.precioAnterior === null || body.precioAnterior === '') datos.precio_anterior = null
        else if (!Number.isInteger(body.precioAnterior) || body.precioAnterior <= 0)
            errores.precioAnterior = 'Debe ser un entero mayor a 0 o vacío'
        else datos.precio_anterior = body.precioAnterior
    }

    // Un precio anterior solo tiene sentido si es mayor al precio actual
    const precio = datos.precio ?? body.precio
    if (datos.precio_anterior && Number.isInteger(precio) && datos.precio_anterior <= precio) {
        errores.precioAnterior = 'Debe ser mayor al precio actual'
    }

    if (parcial && Object.keys(datos).length === 0 && Object.keys(errores).length === 0) {
        errores.general = 'No se envió ningún campo para actualizar'
    }

    return { datos, errores, valido: Object.keys(errores).length === 0 }
}

function validarPedido(body) {
    const errores = {}
    const cliente = body?.cliente ?? {}

    const nombre = textoLimpio(cliente.nombre)
    const telefono = textoLimpio(cliente.telefono).replace(/[\s-]/g, '')
    const direccion = textoLimpio(cliente.direccion)
    const notas = textoLimpio(cliente.notas)
    const metodoPago = body?.metodoPago

    if (nombre.length < 3) errores.nombre = 'Escribe tu nombre completo'
    if (!/^\+?\d{7,13}$/.test(telefono)) errores.telefono = 'Escribe un teléfono válido'
    if (direccion.length < 5) errores.direccion = 'Escribe una dirección válida'
    if (notas.length > 300) errores.notas = 'Máximo 300 caracteres'
    if (!METODOS_PAGO.includes(metodoPago)) errores.metodoPago = 'Elige un método de pago'

    // Junta cantidades si el mismo producto viene repetido
    const porId = new Map()
    if (!Array.isArray(body?.items) || body.items.length === 0) {
        errores.items = 'El carrito está vacío'
    } else {
        for (const item of body.items) {
            if (!Number.isInteger(item?.id) || !Number.isInteger(item?.cantidad) || item.cantidad <= 0) {
                errores.items = 'Hay productos inválidos en el carrito'
                break
            }
            porId.set(item.id, (porId.get(item.id) ?? 0) + item.cantidad)
        }
    }

    return {
        valido: Object.keys(errores).length === 0,
        errores,
        datos: {
            cliente: { nombre, telefono, direccion, notas: notas || null },
            metodoPago,
            items: [...porId].map(([id, cantidad]) => ({ id, cantidad })),
        },
    }
}

function calcularTotales(lineas) {
    const subtotal = lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0)
    const envio = subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO
    return { subtotal, envio, total: subtotal + envio }
}

module.exports = {
    ENVIO_GRATIS_DESDE,
    COSTO_ENVIO,
    METODOS_PAGO,
    ESTADOS_PEDIDO,
    validarProducto,
    validarPedido,
    calcularTotales,
}

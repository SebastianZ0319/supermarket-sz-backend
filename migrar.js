// Actualiza la base de datos a la versión actual. Se puede ejecutar varias veces sin problema.
// Uso: npm run migrar
const pool = require('./db')

const CATEGORIAS = {
    Bebidas: ['coca', 'cola', 'jugo', 'agua', 'gaseosa', 'cafe', 'café'],
    Snacks: ['dorito', 'gomita', 'papas', 'galleta', 'chocolate'],
    Despensa: ['arroz', 'pasta', 'atun', 'atún', 'aceite', 'azucar', 'azúcar', 'frijol'],
    'Lácteos y carnes': ['leche', 'queso', 'yogur', 'salchicha', 'pollo', 'carne', 'huevo'],
    Aseo: ['papel', 'jabon', 'jabón', 'crema dental', 'detergente', 'shampoo'],
}

async function existeColumna(tabla, columna) {
    const [filas] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tabla, columna]
    )
    return filas.length > 0
}

async function existeRestriccion(nombre) {
    const [filas] = await pool.query(
        `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`,
        [nombre]
    )
    return filas.length > 0
}

async function paso(descripcion, fn) {
    const hecho = await fn()
    console.log(`${hecho === false ? '·' : '✓'} ${descripcion}`)
}

async function migrar() {
    await paso('Columna productos.categoria', async () => {
        if (await existeColumna('productos', 'categoria')) return false
        await pool.query('ALTER TABLE productos ADD COLUMN categoria VARCHAR(50) NULL')
    })

    await paso('Columna productos.descripcion', async () => {
        if (await existeColumna('productos', 'descripcion')) return false
        await pool.query('ALTER TABLE productos ADD COLUMN descripcion TEXT NULL')
    })

    await paso('Columna productos.precio_anterior (ofertas)', async () => {
        if (await existeColumna('productos', 'precio_anterior')) return false
        await pool.query('ALTER TABLE productos ADD COLUMN precio_anterior INT NULL')
    })

    await paso('El stock nunca puede ser negativo', async () => {
        if (await existeRestriccion('chk_stock_no_negativo')) return false
        await pool.query('UPDATE productos SET stock = 0 WHERE stock < 0')
        await pool.query('ALTER TABLE productos ADD CONSTRAINT chk_stock_no_negativo CHECK (stock >= 0)')
    })

    await paso('Tabla pedidos', async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                cliente_nombre VARCHAR(100) NOT NULL,
                telefono VARCHAR(20) NOT NULL,
                direccion VARCHAR(255) NOT NULL,
                notas VARCHAR(300) NULL,
                metodo_pago VARCHAR(20) NOT NULL,
                subtotal INT NOT NULL,
                envio INT NOT NULL,
                total INT NOT NULL,
                estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`)
    })

    await paso('Tabla pedido_items', async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedido_items (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                pedido_id INT NOT NULL,
                producto_id INT NULL,
                nombre VARCHAR(100) NOT NULL,
                precio INT NOT NULL,
                cantidad INT NOT NULL,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
            )`)
    })

    await paso('Categorías para productos sin categoría', async () => {
        const [productos] = await pool.query('SELECT id, nombre FROM productos WHERE categoria IS NULL')
        if (productos.length === 0) return false
        for (const p of productos) {
            const nombre = p.nombre.toLowerCase()
            const categoria = Object.keys(CATEGORIAS).find((c) => CATEGORIAS[c].some((k) => nombre.includes(k)))
            if (categoria) await pool.query('UPDATE productos SET categoria = ? WHERE id = ?', [categoria, p.id])
        }
    })

    await paso('Imágenes .png → .webp', async () => {
        const [resultado] = await pool.query(
            `UPDATE productos SET imagen = REPLACE(imagen, '.png', '.webp')
             WHERE imagen LIKE 'Fotos/%.png'`
        )
        if (resultado.affectedRows === 0) return false
    })
}

migrar()
    .then(() => console.log('Migración completa'))
    .catch((error) => {
        console.error('Error en la migración:', error.message)
        process.exitCode = 1
    })
    .finally(() => pool.end())

# Supermarket SZ — Backend

API en Express 5 + MySQL para la tienda `supermarket-sz-react`.

## Puesta en marcha

```bash
cp .env.example .env   # completa los datos de MySQL y una ADMIN_KEY
npm install
npm run migrar         # crea/actualiza tablas (se puede ejecutar varias veces)
npm run dev            # http://localhost:3000, se reinicia al guardar
```

## Rutas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/productos` | Público | Lista de productos |
| GET | `/productos/:id` | Público | Un producto |
| POST | `/pedidos` | Público | Crea un pedido: valida y descuenta stock en una transacción |
| POST | `/productos` | Admin | Crea un producto |
| PUT | `/productos/:id` | Admin | Actualiza campos de un producto |
| DELETE | `/productos/:id` | Admin | Elimina un producto |
| GET | `/pedidos` | Admin | Últimos 100 pedidos |
| PATCH | `/pedidos/:id` | Admin | Cambia el estado; `cancelado` devuelve el stock |
| GET | `/admin/verificar` | Admin | Comprueba la clave |

Las rutas de admin requieren el header `x-admin-key` con el valor de `ADMIN_KEY`.

## Reglas importantes

- El stock **solo** se descuenta al crear un pedido, nunca al agregar al carrito.
- Los precios del pedido se toman de la base de datos, no de lo que envía el cliente.
- `SELECT ... FOR UPDATE` evita que dos compras simultáneas vendan el mismo stock.
- La base de datos tiene un `CHECK (stock >= 0)`.
- El costo de envío está en `validaciones.js` y debe coincidir con `src/utils/tienda.js` del frontend.

## Pruebas

```bash
npm test
```

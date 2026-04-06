const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ─── AUTH ─────────────────────────────────────────────────────────────────────

const AUTH_USER   = process.env.APP_USERNAME || '';
const AUTH_PASS   = process.env.APP_PASSWORD || '';
const AUTH_SECRET = process.env.APP_SECRET   || 'karybu-2024-secret';

function makeToken(u, p) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(u + ':' + p).digest('hex');
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  );
}

function requireAuth(req, res, next) {
  const open = ['/login', '/logout', '/health'];
  if (open.includes(req.path)) return next();
  const cookies = parseCookies(req.headers.cookie);
  if (AUTH_PASS && cookies.karybu_auth === makeToken(AUTH_USER, AUTH_PASS)) return next();
  if (!AUTH_PASS) return next(); // sin contraseña configurada, permitir todo
  res.status(401).json({ error: 'No autorizado' });
}

app.use('/api', requireAuth);

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    const token = makeToken(username, password);
    res.setHeader('Set-Cookie', `karybu_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'karybu_auth=; Path=/; Max-Age=0');
  res.json({ success: true });
});

const getSQL = () => {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('No database URL configured');
  return neon(url);
};

// ─── INIT ────────────────────────────────────────────────────────────────────

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  const sql = getSQL();

  await sql`
    CREATE TABLE IF NOT EXISTS productos (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(50) UNIQUE NOT NULL,
      cantidad INTEGER DEFAULT 0,
      material VARCHAR(100) DEFAULT '',
      detalle TEXT DEFAULT '',
      costo_unitario NUMERIC(12,2) DEFAULT 0,
      precio_venta NUMERIC(12,2) DEFAULT 0,
      minimo INTEGER DEFAULT 3
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS ventas (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(50),
      detalle TEXT,
      cantidad INTEGER,
      precio_unitario NUMERIC(12,2),
      total NUMERIC(12,2),
      cliente VARCHAR(200) DEFAULT '',
      telefono VARCHAR(50) DEFAULT '',
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      pagado BOOLEAN DEFAULT TRUE,
      venta_grupo VARCHAR(50) DEFAULT ''
    )`;
  await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS venta_grupo VARCHAR(50) DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS compras (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(50),
      material VARCHAR(100),
      cantidad INTEGER,
      costo_unitario NUMERIC(12,2),
      total NUMERIC(12,2),
      proveedor VARCHAR(200) DEFAULT '',
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      telefono VARCHAR(50) DEFAULT '',
      mail VARCHAR(200) DEFAULT '',
      direccion TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )`;

  // Seed products (only if empty)
  const [{ count }] = await sql`SELECT COUNT(*) as count FROM productos`;
  if (parseInt(count) === 0) {
    const productos = [
      { codigo: '16',    cantidad: 1,  material: 'BRONCE',         detalle: 'AROS BRONCE VARIOS MODELOS (26170)',                                              costo: 6600,  precio: 17000 },
      { codigo: '34',    cantidad: 1,  material: 'PLATA LAMINADA', detalle: 'CADENA MIXPER',                                                                   costo: 6300,  precio: 17000 },
      { codigo: '44',    cantidad: 1,  material: 'ACERO',          detalle: 'ARO AQD ARGOLLA CLIC CON DIJE INFLADO / ARO ACERO DORADO COLGANTE CORAZON',       costo: 4100,  precio: 10250 },
      { codigo: '48',    cantidad: 1,  material: 'ACERO',          detalle: 'ARO AQP ARGOLLA INFLADA PASANTE / ARO GOTAS GRANDE / ARO CON PERLA / ARO BLANCO-DORADO INFLADO / ARO QUIRURGICO FLOR STRASS', costo: 3600, precio: 9000 },
      { codigo: '99',    cantidad: 1,  material: 'FANTASIA',       detalle: 'SET CADENA DORADA C/DIJE CORAZON+AROS / AROS INFLADOS PERNO / HEBILLA METAL / ARO ESPIRAL / ARO ARGOLLA ACERO', costo: 4100, precio: 10500 },
      { codigo: '110',   cantidad: 4,  material: 'ACERO',          detalle: 'AROS ARGOLLA VARIOS: BOMBE CALADA / PIERCING / CINTA MICROPAVE / INFLADA / CEREZA STRASS / ARGOLLA STRASS / COLGANTE ESTRELLA', costo: 3800, precio: 0 },
      { codigo: '121',   cantidad: 1,  material: 'BRONCE',         detalle: 'AROS BRONCE VARIOS MODELOS (26760-26761-26109-26759-5733)',                       costo: 5700,  precio: 15000 },
      { codigo: '122',   cantidad: 3,  material: 'BRONCE',         detalle: 'ANILLO BRONCE BAÑADO C/STRASS REGULABLE / ANILLO BRONCE BAÑADO C/STRASS MICROPAVE', costo: 3900, precio: 10000 },
      { codigo: '125',   cantidad: 1,  material: 'PLATA LAMINADA', detalle: 'PULSERA LAMINADA EN PLATA TIPO PANDORA FLEXIBLE - PULSERA ZIRCONIA',             costo: 12500, precio: 32000 },
      { codigo: '131',   cantidad: 3,  material: 'PLATA LAMINADA', detalle: 'CHARM DE PLATA LAMINADA (PRECIO POR UNIDAD)',                                    costo: 6600,  precio: 0 },
      { codigo: '149',   cantidad: 2,  material: 'ACERO',          detalle: 'ARO ACERO ARGOLLA CON STRASS / ARO ESPIGA STRASS / ARO BLANCO DOBLE CON STRASS / ARO BLANCO-DORADO CANASTA', costo: 3300, precio: 8500 },
      { codigo: '150',   cantidad: 1,  material: 'ACERO',          detalle: 'ARO ARGOLLAS / ARO ACERO BLANCO ARGOLLA 626C / ARO ACERO DORADO FLOR CON STRASS 675B', costo: 2400, precio: 0 },
      { codigo: '153',   cantidad: 1,  material: 'ACERO',          detalle: 'ARO VAQUITA DE SAN ANTONIO / ARO CEREZA / ARO BOLITA PLATEADA / ARO CON BRILLITO (MARIPOSA-TREBOL-LUNA-CORAZON) / ARO ESTRELLA ENGARZADA', costo: 1100, precio: 4000 },
      { codigo: '154',   cantidad: 1,  material: 'ACERO',          detalle: 'ARO ACERO CORAZON ENGARZADO DORADO / ARO BOLITA PLATEADA CON STRASS',             costo: 1200,  precio: 4000 },
      { codigo: '155',   cantidad: 3,  material: 'ACERO',          detalle: 'ARO ARGOLLA CRUZ CRUZADA / ARO ABRIDOR BLANCO CEREZA / ARO TREPADOR BOLITAS / ARO ARGOLLAS BLANCO VARIOS TAMAÑOS', costo: 2700, precio: 0 },
      { codigo: '157',   cantidad: 4,  material: 'ACERO',          detalle: 'ARO ABRIDOR VAN CLEEF / ARO ABRIDOR CEREZA-FRUTILLA / ARO ABRIDOR CORAZON-ESTRELLA-MARGARITAS / ARO BLANCO BRIZURA FLOR', costo: 2200, precio: 6000 },
      { codigo: '158',   cantidad: 2,  material: 'ACERO',          detalle: 'CADENA ACERO BLANCO',                                                             costo: 2900,  precio: 7500 },
      { codigo: '163',   cantidad: 2,  material: 'ACERO',          detalle: 'DIJE ACERO VARIOS MODELOS',                                                      costo: 3300,  precio: 8300 },
      { codigo: '171',   cantidad: 1,  material: 'ACERO',          detalle: 'ARO ACERO DORADO CORAZON / ARO ARGOLLA CON STRASS / ARO ARGOLLA BLANCO / ARO ARGOLLA DORADO / ARO ARGOLLA CORAZON', costo: 2600, precio: 6500 },
      { codigo: '172',   cantidad: 1,  material: 'ACERO',          detalle: 'ARO ARGOLLA COLGANTE CON CUBIC',                                                 costo: 3200,  precio: 8000 },
      { codigo: '173',   cantidad: 1,  material: 'ACERO',          detalle: 'ARGOLLA GRANDE PASANTE 106C / ARGOLLA ACERO BLANCO 433C',                        costo: 4000,  precio: 10000 },
      { codigo: '182/1', cantidad: 2,  material: 'ACERO',          detalle: 'ARO QUIRURGICO ESTRELLA COLGANTE / ARO STRASS DOBLE / ARO CORAZON DOBLE / ARO QUIRURGICO CON STRASS', costo: 3100, precio: 8000 },
      { codigo: '185',   cantidad: 1,  material: 'ACERO',          detalle: 'ANILLO ACERO BLANCO VARIOS MODELOS -680C-688C',                                  costo: 1600,  precio: 0 },
      { codigo: '186',   cantidad: 6,  material: 'ACERO',          detalle: 'ANILLO ACERO QUIRURGICO VARIOS MODELOS',                                         costo: 2000,  precio: 6000 },
      { codigo: '170',   cantidad: 1,  material: 'BRONCE',         detalle: 'ARO DE BRONCE (SANDIA, ANANA, UVA)',                                             costo: 3700,  precio: 10000 },
    ];

    for (const p of productos) {
      await sql`
        INSERT INTO productos (codigo, cantidad, material, detalle, costo_unitario, precio_venta)
        VALUES (${p.codigo}, ${p.cantidad}, ${p.material}, ${p.detalle}, ${p.costo}, ${p.precio})
        ON CONFLICT (codigo) DO NOTHING`;
    }
  }

  initialized = true;
}

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await ensureInit();
    await fn(req, res, next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─── HEALTH ──────────────────────────────────────────────────────────────────

app.get('/api/health', asyncHandler(async (req, res) => {
  res.json({ status: 'ok', db: 'neon' });
}));

// ─── STOCK ───────────────────────────────────────────────────────────────────

app.get('/api/stock', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const rows = await sql`
    SELECT codigo, cantidad, material, detalle, costo_unitario, precio_venta, minimo
    FROM productos ORDER BY codigo`;
  res.json(rows.map(r => ({
    codigo: r.codigo,
    cantidad: r.cantidad,
    material: r.material,
    detalle: r.detalle,
    costoUnitario: parseFloat(r.costo_unitario),
    precioVenta: parseFloat(r.precio_venta),
    minimo: r.minimo,
  })));
}));

app.put('/api/stock/:codigo', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { detalle, cantidad, precioVenta, costoUnitario } = req.body;
  if (detalle !== undefined) {
    await sql`UPDATE productos SET detalle = ${detalle} WHERE codigo = ${req.params.codigo}`;
  }
  if (cantidad !== undefined) {
    await sql`UPDATE productos SET cantidad = ${cantidad} WHERE codigo = ${req.params.codigo}`;
  }
  if (precioVenta !== undefined) {
    await sql`UPDATE productos SET precio_venta = ${precioVenta} WHERE codigo = ${req.params.codigo}`;
  }
  if (costoUnitario !== undefined) {
    await sql`UPDATE productos SET costo_unitario = ${costoUnitario} WHERE codigo = ${req.params.codigo}`;
  }
  res.json({ success: true });
}));

app.post('/api/stock', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { codigo, cantidad, material, detalle, costoUnitario, precioVenta } = req.body;
  await sql`
    INSERT INTO productos (codigo, cantidad, material, detalle, costo_unitario, precio_venta)
    VALUES (${codigo}, ${cantidad || 0}, ${material || ''}, ${detalle || ''}, ${costoUnitario || 0}, ${precioVenta || 0})
    ON CONFLICT (codigo) DO UPDATE SET
      cantidad = EXCLUDED.cantidad,
      material = EXCLUDED.material,
      detalle = EXCLUDED.detalle,
      costo_unitario = EXCLUDED.costo_unitario,
      precio_venta = EXCLUDED.precio_venta`;
  res.json({ success: true });
}));

// ─── VENTAS ──────────────────────────────────────────────────────────────────

app.get('/api/ventas', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { desde, hasta } = req.query;
  let rows;
  if (desde && hasta) {
    rows = await sql`
      SELECT * FROM ventas WHERE fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY created_at DESC`;
  } else {
    rows = await sql`SELECT * FROM ventas ORDER BY created_at DESC LIMIT 200`;
  }
  res.json(rows.map(r => ({
    id: r.id,
    codigo: r.codigo,
    detalle: r.detalle,
    cantidad: r.cantidad,
    precioUnitario: parseFloat(r.precio_unitario),
    total: parseFloat(r.total),
    cliente: r.cliente,
    telefono: r.telefono,
    fecha: r.fecha,
  })));
}));

app.post('/api/ventas', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { items, cliente = '', telefono = '', pagado = true } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un producto' });
  }

  const fecha = new Date().toISOString().split('T')[0];
  const grupo = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  for (const item of items) {
    const { codigo, detalle, cantidad, precioUnitario } = item;
    const total = cantidad * precioUnitario;
    await sql`
      INSERT INTO ventas (codigo, detalle, cantidad, precio_unitario, total, cliente, telefono, fecha, pagado, venta_grupo)
      VALUES (${codigo}, ${detalle || ''}, ${cantidad}, ${precioUnitario}, ${total}, ${cliente}, ${telefono}, ${fecha}, ${pagado}, ${grupo})`;
    await sql`
      UPDATE productos SET cantidad = GREATEST(0, cantidad - ${parseInt(cantidad)})
      WHERE codigo = ${codigo}`;
  }

  res.json({ success: true, grupo, mensaje: 'Venta registrada' });
}));

app.get('/api/fiados', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const rows = await sql`
    SELECT venta_grupo, cliente, telefono, fecha, created_at,
           SUM(total) as total_grupo,
           json_agg(json_build_object('detalle', detalle, 'cantidad', cantidad, 'precioUnitario', precio_unitario, 'total', total) ORDER BY id) as items
    FROM ventas
    WHERE pagado = FALSE AND venta_grupo != ''
    GROUP BY venta_grupo, cliente, telefono, fecha, created_at
    ORDER BY created_at DESC`;
  res.json(rows.map(r => ({
    grupo: r.venta_grupo,
    cliente: r.cliente,
    telefono: r.telefono,
    fecha: r.fecha,
    total: parseFloat(r.total_grupo),
    items: r.items,
  })));
}));

app.put('/api/fiados/:grupo/pagar', asyncHandler(async (req, res) => {
  const sql = getSQL();
  await sql`UPDATE ventas SET pagado = TRUE WHERE venta_grupo = ${req.params.grupo}`;
  res.json({ success: true });
}));

app.get('/api/historial', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const rows = await sql`
    SELECT venta_grupo, cliente, telefono, fecha, created_at, pagado,
           SUM(total) as total_grupo,
           json_agg(json_build_object('detalle', detalle, 'cantidad', cantidad, 'precioUnitario', precio_unitario, 'total', total) ORDER BY id) as items
    FROM ventas
    WHERE venta_grupo != ''
    GROUP BY venta_grupo, cliente, telefono, fecha, created_at, pagado
    ORDER BY created_at DESC
    LIMIT 50`;
  res.json(rows.map(r => ({
    grupo: r.venta_grupo,
    cliente: r.cliente,
    telefono: r.telefono,
    fecha: r.fecha,
    pagado: r.pagado,
    total: parseFloat(r.total_grupo),
    items: r.items,
  })));
}));

// ─── COMPRAS ─────────────────────────────────────────────────────────────────

app.get('/api/compras', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM compras ORDER BY created_at DESC LIMIT 200`;
  res.json(rows.map(r => ({
    id: r.id,
    codigo: r.codigo,
    material: r.material,
    cantidad: r.cantidad,
    costoUnitario: parseFloat(r.costo_unitario),
    total: parseFloat(r.total),
    proveedor: r.proveedor,
    fecha: r.fecha,
  })));
}));

app.post('/api/compras', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { codigo, material, cantidad, costoUnitario, proveedor } = req.body;
  const total = cantidad * (costoUnitario || 0);
  const fecha = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO compras (codigo, material, cantidad, costo_unitario, total, proveedor, fecha)
    VALUES (${codigo}, ${material || ''}, ${cantidad}, ${costoUnitario || 0}, ${total}, ${proveedor || ''}, ${fecha})`;

  await sql`
    UPDATE productos
    SET cantidad = cantidad + ${parseInt(cantidad)}, costo_unitario = ${costoUnitario || 0}
    WHERE codigo = ${codigo}`;

  res.json({ success: true, mensaje: 'Compra registrada y stock actualizado' });
}));

// ─── CLIENTES ────────────────────────────────────────────────────────────────

app.get('/api/clientes', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM clientes ORDER BY nombre`;
  res.json(rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono,
    mail: r.mail,
    direccion: r.direccion,
  })));
}));

app.post('/api/clientes', asyncHandler(async (req, res) => {
  const sql = getSQL();
  const { nombre, telefono, mail, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const [row] = await sql`
    INSERT INTO clientes (nombre, telefono, mail, direccion)
    VALUES (${nombre}, ${telefono || ''}, ${mail || ''}, ${direccion || ''})
    RETURNING *`;
  res.json({ success: true, cliente: row });
}));

// ─── DATOS / ANALYTICS ───────────────────────────────────────────────────────

app.get('/api/datos', asyncHandler(async (req, res) => {
  const sql = getSQL();

  const [hoy] = await sql`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
    FROM ventas WHERE fecha = CURRENT_DATE`;

  const [semana] = await sql`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
    FROM ventas WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'`;

  const [mes] = await sql`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
    FROM ventas WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'`;

  const topProductos = await sql`
    SELECT codigo, detalle, SUM(cantidad) as total_unidades, SUM(total) as total_pesos
    FROM ventas
    WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY codigo, detalle
    ORDER BY total_unidades DESC
    LIMIT 5`;

  const stockBajo = await sql`
    SELECT codigo, detalle, cantidad, minimo FROM productos
    WHERE cantidad <= minimo ORDER BY cantidad ASC`;

  const [ganancia] = await sql`
    SELECT
      COALESCE(SUM(v.total), 0) as ingresos,
      COALESCE(SUM(v.cantidad * p.costo_unitario), 0) as costos
    FROM ventas v
    LEFT JOIN productos p ON v.codigo = p.codigo
    WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'`;

  const ventasPorDia = await sql`
    SELECT fecha::text, SUM(total) as total
    FROM ventas
    WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY fecha ORDER BY fecha`;

  res.json({
    hoy: { total: parseFloat(hoy.total), cantidad: parseInt(hoy.cantidad) },
    semana: { total: parseFloat(semana.total), cantidad: parseInt(semana.cantidad) },
    mes: { total: parseFloat(mes.total), cantidad: parseInt(mes.cantidad) },
    topProductos: topProductos.map(r => ({
      codigo: r.codigo,
      detalle: r.detalle,
      totalUnidades: parseInt(r.total_unidades),
      totalPesos: parseFloat(r.total_pesos),
    })),
    stockBajo: stockBajo.map(r => ({
      codigo: r.codigo,
      detalle: r.detalle,
      cantidad: r.cantidad,
      minimo: r.minimo,
    })),
    ganancia: {
      ingresos: parseFloat(ganancia.ingresos),
      costos: parseFloat(ganancia.costos),
      neta: parseFloat(ganancia.ingresos) - parseFloat(ganancia.costos),
    },
    ventasPorDia: ventasPorDia.map(r => ({
      fecha: r.fecha,
      total: parseFloat(r.total),
    })),
  });
}));

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Karybu running on port ${PORT}`));

module.exports = app;

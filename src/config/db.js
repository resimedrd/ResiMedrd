const { Pool } = require("pg");

let poolInstance = null;
let dbInstance = null;
const ADMIN_EMAIL = "dr.frankespinalc@gmail.com";

async function conectarBaseDeDatos() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida en las variables de entorno.");
  }

  console.log("Conectando a base de datos de PostgreSQL en Supabase...");
  poolInstance = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Requerido para conexiones seguras en Supabase
    }
  });

  // Hacemos una consulta rápida para comprobar la conexión
  await poolInstance.query("SELECT NOW()");
  console.log("📈 Conectado exitosamente a Supabase PostgreSQL.");

  // Adaptador de compatibilidad de SQLite a Postgres
  dbInstance = {
    async get(sql, params = []) {
      const pgSql = translateSql(sql);
      const res = await poolInstance.query(pgSql, params);
      return res.rows[0];
    },
    async all(sql, params = []) {
      const pgSql = translateSql(sql);
      const res = await poolInstance.query(pgSql, params);
      return res.rows;
    },
    async run(sql, params = []) {
      const pgSql = translateSql(sql);
      let finalSql = pgSql;
      if (pgSql.trim().toUpperCase().startsWith("INSERT")) {
        if (!pgSql.toUpperCase().includes("RETURNING")) {
          // Intentar agregar RETURNING id para emular lastID de SQLite
          finalSql = `${pgSql} RETURNING id`;
        }
      }
      let res;
      try {
        res = await poolInstance.query(finalSql, params);
      } catch (err) {
        if (err.code === "42703" && finalSql !== pgSql) {
          res = await poolInstance.query(pgSql, params);
        } else {
          throw err;
        }
      }
      const lastRow = res.rows ? res.rows[0] : null;
      return {
        lastID: lastRow ? lastRow.id : null,
        changes: res.rowCount
      };
    },
    async exec(sql) {
      return poolInstance.query(sql);
    },
    async transaction(callback) {
      const client = await poolInstance.connect();
      const txDb = {
        async get(sql, params = []) {
          const pgSql = translateSql(sql);
          const res = await client.query(pgSql, params);
          return res.rows[0];
        },
        async all(sql, params = []) {
          const pgSql = translateSql(sql);
          const res = await client.query(pgSql, params);
          return res.rows;
        },
        async run(sql, params = []) {
          const pgSql = translateSql(sql);
          let finalSql = pgSql;
          if (pgSql.trim().toUpperCase().startsWith("INSERT")) {
            if (!pgSql.toUpperCase().includes("RETURNING")) {
              finalSql = `${pgSql} RETURNING id`;
            }
          }
          let res;
          try {
            res = await client.query(finalSql, params);
          } catch (err) {
            if (err.code === "42703" && finalSql !== pgSql) {
              res = await client.query(pgSql, params);
            } else {
              throw err;
            }
          }
          const lastRow = res.rows ? res.rows[0] : null;
          return {
            lastID: lastRow ? lastRow.id : null,
            changes: res.rowCount
          };
        },
        async exec(sql) {
          return client.query(sql);
        }
      };

      try {
        await client.query("BEGIN");
        const result = await callback(txDb);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      if (poolInstance) {
        await poolInstance.end();
        poolInstance = null;
        dbInstance = null;
      }
    }
  };

  return dbInstance;
}

function getDB() {
  if (!dbInstance) {
    throw new Error("Base de datos no inicializada. Llama a conectarBaseDeDatos primero.");
  }
  return dbInstance;
}

function translateSql(sql) {
  // Traducir los marcadores de posición "?" de SQLite a "$1", "$2", etc. de Postgres
  let index = 1;
  let translated = sql.replace(/\?/g, () => `$${index++}`);

  // Reemplazar la función RANDOM() de SQLite por random() de Postgres
  translated = translated.replace(/ORDER BY RANDOM\(\)/gi, "ORDER BY random()");

  return translated;
}

module.exports = {
  conectarBaseDeDatos,
  getDB,
  ADMIN_EMAIL
};

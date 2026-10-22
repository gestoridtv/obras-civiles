(function () {
  const DB_NAME = 'obras-civiles-db';
  const DB_VERSION = 1;
  const CATEGORIAS_SUGERIDAS = ['Estructura', 'Eléctrico', 'Sanitario/Plomería', 'Acabados', 'Carpintería', 'Otros'];

  let dbPromise = null;

  function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('proyectos')) {
          db.createObjectStore('proyectos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('requerimientos')) {
          const store = db.createObjectStore('requerimientos', { keyPath: 'id' });
          store.createIndex('proyectoId', 'proyectoId', { unique: false });
        }
      };
      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
    return dbPromise;
  }

  function init() {
    return abrirDB().then(() => undefined);
  }

  function tx(storeName, mode) {
    return abrirDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function generarId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function crearProyecto({ nombre, cliente }) {
    const proyecto = {
      id: generarId(),
      nombre,
      cliente,
      fechaCreacion: new Date().toISOString(),
      estado: 'captura',
      categorias: CATEGORIAS_SUGERIDAS.slice(),
    };
    return tx('proyectos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.add(proyecto);
      req.onsuccess = () => resolve(proyecto);
      req.onerror = () => reject(req.error);
    }));
  }

  function listarProyectos() {
    return tx('proyectos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)));
      req.onerror = () => reject(req.error);
    }));
  }

  function obtenerProyecto(id) {
    return tx('proyectos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function actualizarProyecto(id, cambios) {
    return tx('proyectos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const actual = getReq.result;
        if (!actual) { reject(new Error('Proyecto no encontrado: ' + id)); return; }
        const actualizado = Object.assign({}, actual, cambios);
        const putReq = store.put(actualizado);
        putReq.onsuccess = () => resolve(actualizado);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    }));
  }

  function eliminarProyecto(id) {
    return listarRequerimientos(id)
      .then((reqs) => Promise.all(reqs.map((r) => eliminarRequerimiento(r.id))))
      .then(() => tx('proyectos', 'readwrite'))
      .then((store) => new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }));
  }

  function crearRequerimiento(proyectoId, texto) {
    return listarRequerimientos(proyectoId).then((existentes) => {
      const requerimiento = {
        id: generarId(),
        proyectoId,
        texto,
        categoria: null,
        orden: existentes.length,
        fechaCaptura: new Date().toISOString(),
        checkEstado: 'pendiente',
      };
      return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
        const req = store.add(requerimiento);
        req.onsuccess = () => resolve(requerimiento);
        req.onerror = () => reject(req.error);
      }));
    });
  }

  function listarRequerimientos(proyectoId) {
    return tx('requerimientos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const index = store.index('proyectoId');
      const req = index.getAll(proyectoId);
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.orden - b.orden));
      req.onerror = () => reject(req.error);
    }));
  }

  function actualizarRequerimiento(id, cambios) {
    return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const actual = getReq.result;
        if (!actual) { reject(new Error('Requerimiento no encontrado: ' + id)); return; }
        const actualizado = Object.assign({}, actual, cambios);
        const putReq = store.put(actualizado);
        putReq.onsuccess = () => resolve(actualizado);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    }));
  }

  function eliminarRequerimiento(id) {
    return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  window.DB = {
    CATEGORIAS_SUGERIDAS,
    init,
    crearProyecto,
    listarProyectos,
    obtenerProyecto,
    actualizarProyecto,
    eliminarProyecto,
    crearRequerimiento,
    listarRequerimientos,
    actualizarRequerimiento,
    eliminarRequerimiento,
  };
})();

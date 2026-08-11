var Almacen = (function () {

  var CLAVE = 'organizador_pasc_v1';
  var COLECCIONES = ['solicitudes', 'tareas', 'transportes', 'contactos'];

  function vacio() {
    return { version: 1, solicitudes: [], tareas: [], transportes: [], contactos: [] };
  }

  var datos = cargar();

  function cargar() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      if (!crudo) return vacio();
      var d = JSON.parse(crudo);
      var base = vacio();
      COLECCIONES.forEach(function (c) {
        if (Array.isArray(d[c])) base[c] = d[c];
      });
      return base;
    } catch (e) {
      console.error('No se pudo leer el almacenamiento:', e);
      return vacio();
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (e) {
      U.aviso('No se pudieron guardar los datos: ' + e.message, 'error');
      return false;
    }
  }

  function lista(coleccion) {
    return datos[coleccion] || [];
  }

  function buscarPorId(coleccion, id) {
    return lista(coleccion).filter(function (r) { return r.id === id; })[0] || null;
  }

  function agregar(coleccion, registro) {
    registro.id = registro.id || U.uid();
    registro.creado = registro.creado || new Date().toISOString();
    registro.actualizado = registro.creado;
    datos[coleccion].unshift(registro);
    guardar();
    return registro;
  }

  function actualizar(coleccion, id, cambios) {
    var r = buscarPorId(coleccion, id);
    if (!r) return null;
    Object.keys(cambios).forEach(function (k) { r[k] = cambios[k]; });
    r.actualizado = new Date().toISOString();
    guardar();
    return r;
  }

  function eliminar(coleccion, id) {
    datos[coleccion] = lista(coleccion).filter(function (r) { return r.id !== id; });
    guardar();
  }

  function reemplazarTodo(nuevos) {
    var base = vacio();
    COLECCIONES.forEach(function (c) {
      if (Array.isArray(nuevos[c])) base[c] = nuevos[c];
    });
    datos = base;
    guardar();
  }

  function exportarJSON() {
    return JSON.stringify(datos, null, 2);
  }

  function totales() {
    return {
      solicitudes: lista('solicitudes').length,
      tareas: lista('tareas').length,
      transportes: lista('transportes').length,
      contactos: lista('contactos').length
    };
  }

  return {
    COLECCIONES: COLECCIONES,
    get datos() { return datos; },
    lista: lista,
    buscarPorId: buscarPorId,
    agregar: agregar,
    actualizar: actualizar,
    eliminar: eliminar,
    reemplazarTodo: reemplazarTodo,
    exportarJSON: exportarJSON,
    guardar: guardar,
    totales: totales
  };
})();

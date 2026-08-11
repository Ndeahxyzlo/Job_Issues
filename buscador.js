var Buscador = (function () {

  var termino = '';

  function ejecutar(texto) {
    termino = texto || '';
    var caja = document.getElementById('busqueda-global');
    if (caja) caja.value = termino;
    App.ir('resultados');
  }

  function resultados() {
    var t = termino;
    if (!t || t.trim().length < 2) return null;

    return {
      solicitudes: Almacen.lista('solicitudes').filter(function (s) {
        return U.contiene([s.asunto, s.mensaje, s.notas, s.solicitante, s.canal, s.telefono].join(' '), t);
      }),
      tareas: Almacen.lista('tareas').filter(function (r) {
        return U.contiene([r.titulo, r.detalle, r.notas, r.contactoId ? Contactos.nombre(r.contactoId) : ''].join(' '), t);
      }),
      transportes: Almacen.lista('transportes').filter(function (r) {
        return U.contiene([r.origen, r.destino, Transportes.detalle(r), r.notas, r.fecha].join(' '), t);
      }),
      contactos: Almacen.lista('contactos').filter(function (c) {
        return U.contiene([c.nombre, c.area, c.telefono, c.notas].join(' '), t);
      })
    };
  }

  function render(cont) {
    var r = resultados();

    if (!r) {
      cont.innerHTML = '<div class="vista-cabecera"><div><h1>Búsqueda</h1>' +
        '<p>Escribe al menos 2 letras en la barra de arriba.</p></div></div>';
      return;
    }

    var total = r.solicitudes.length + r.tareas.length + r.transportes.length + r.contactos.length;

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Resultados de «' + U.esc(termino) + '»</h1>' +
        '<p>' + total + ' coincidencia' + (total === 1 ? '' : 's') + ' en todo el historial.</p></div>' +
        '<div class="derecha"><button class="btn" id="limpiar-busqueda">Limpiar</button></div>' +
      '</div>' +
      (total === 0
        ? '<div class="tarjeta"><div class="vacio"><strong>Sin resultados</strong>Prueba con otra palabra.</div></div>'
        : bloque('Solicitudes', r.solicitudes, function (s) {
            return '<td><div class="principal-celda">' + U.esc(s.asunto) + '</div>' +
              '<div class="recorte secundario">' + U.esc(s.mensaje || '') + '</div></td>' +
              '<td>' + U.esc(s.solicitante || '') + '</td>' +
              '<td>' + U.fechaCorta(s.fecha || s.creado) + '</td>' +
              '<td>' + U.etiqueta(s.estado || 'pendiente') + '</td>' +
              '<td class="acciones"><button class="btn btn-mini" data-abrir-solicitud="' + s.id + '">Abrir</button></td>';
          }, ['Asunto', 'Solicitante', 'Fecha', 'Estado', '']) +
          bloque('Tareas', r.tareas, function (t) {
            return '<td><div class="principal-celda">' + U.esc(t.titulo) + '</div>' +
              '<div class="recorte secundario">' + U.esc(t.detalle || '') + '</div></td>' +
              '<td>' + U.esc(t.contactoId ? Contactos.nombre(t.contactoId) : '') + '</td>' +
              '<td>' + (t.vence ? U.fechaCorta(t.vence) : '—') + '</td>' +
              '<td>' + U.etiqueta(t.estado || 'pendiente') + '</td>' +
              '<td class="acciones"><button class="btn btn-mini" data-abrir-tarea="' + t.id + '">Abrir</button></td>';
          }, ['Tarea', 'Pedida por', 'Vence', 'Estado', '']) +
          bloque('Transportes', r.transportes, function (t) {
            return '<td>' + U.fechaCorta(t.fecha) + '</td>' +
              '<td class="principal-celda">' + U.esc(t.origen || '') +
                '<span class="secundario">→ ' + U.esc(t.destino || '') + '</span></td>' +
              '<td><div class="recorte">' + U.esc(Transportes.detalle(t)) + '</div></td>' +
              '<td>' + U.esc(Transportes.moneda(t.valor)) + '</td>' +
              '<td class="acciones"><button class="btn btn-mini" data-abrir-transporte="' + t.id + '">Abrir</button></td>';
          }, ['Fecha', 'Recorrido', 'Detalle', 'Valor', '']) +
          bloque('Contactos', r.contactos, function (c) {
            return '<td class="principal-celda">' + U.esc(c.nombre) + '</td>' +
              '<td>' + U.esc(c.area || '') + '</td>' +
              '<td>' + U.esc(c.telefono || '') + '</td>' +
              '<td class="acciones"><button class="btn btn-mini" data-abrir-contacto="' + c.id + '">Abrir</button></td>';
          }, ['Nombre', 'Área', 'Teléfono', '']));

    var limpiar = cont.querySelector('#limpiar-busqueda');
    if (limpiar) limpiar.onclick = function () {
      termino = '';
      document.getElementById('busqueda-global').value = '';
      App.ir('inicio');
    };

    cont.querySelectorAll('[data-abrir-solicitud]').forEach(function (b) {
      b.onclick = function () { Solicitudes.formulario(Almacen.buscarPorId('solicitudes', b.dataset.abrirSolicitud)); };
    });
    cont.querySelectorAll('[data-abrir-tarea]').forEach(function (b) {
      b.onclick = function () { Tareas.formulario(Almacen.buscarPorId('tareas', b.dataset.abrirTarea)); };
    });
    cont.querySelectorAll('[data-abrir-transporte]').forEach(function (b) {
      b.onclick = function () { Transportes.formulario(Almacen.buscarPorId('transportes', b.dataset.abrirTransporte)); };
    });
    cont.querySelectorAll('[data-abrir-contacto]').forEach(function (b) {
      b.onclick = function () { Contactos.formulario(Almacen.buscarPorId('contactos', b.dataset.abrirContacto)); };
    });
  }

  function bloque(titulo, registros, filaFn, columnas) {
    if (!registros.length) return '';
    return '<div class="tarjeta">' +
      '<div class="tarjeta-cabecera"><h2>' + U.esc(titulo) + ' (' + registros.length + ')</h2></div>' +
      '<div class="tabla-envoltura"><table><thead><tr>' +
        columnas.map(function (c) { return '<th>' + U.esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      registros.map(function (r) { return '<tr>' + filaFn(r) + '</tr>'; }).join('') +
      '</tbody></table></div></div>';
  }

  function fijarTermino(t) { termino = t; }

  return { render: render, ejecutar: ejecutar, fijarTermino: fijarTermino };
})();

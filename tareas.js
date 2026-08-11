var Tareas = (function () {

  var filtros = { estado: 'abiertas', prioridad: '', texto: '' };

  function todas() { return Almacen.lista('tareas'); }

  function abiertas() {
    return todas().filter(function (t) { return t.estado !== 'hecha'; });
  }

  function vencidas() {
    return abiertas().filter(function (t) {
      return t.vence && U.diasHasta(t.vence) < 0;
    });
  }

  function paraHoy() {
    return abiertas().filter(function (t) {
      return t.vence && U.diasHasta(t.vence) === 0;
    });
  }

  var ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };

  function ordenar(arr) {
    return arr.slice().sort(function (a, b) {
      var va = a.vence ? U.diasHasta(a.vence) : 9999;
      var vb = b.vence ? U.diasHasta(b.vence) : 9999;
      if (va !== vb) return va - vb;
      var pa = ORDEN_PRIORIDAD[a.prioridad] !== undefined ? ORDEN_PRIORIDAD[a.prioridad] : 3;
      var pb = ORDEN_PRIORIDAD[b.prioridad] !== undefined ? ORDEN_PRIORIDAD[b.prioridad] : 3;
      return pa - pb;
    });
  }

  function filtrar() {
    return ordenar(todas().filter(function (t) {
      if (filtros.estado === 'abiertas' && t.estado === 'hecha') return false;
      if (filtros.estado && filtros.estado !== 'abiertas' && t.estado !== filtros.estado) return false;
      if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
      if (filtros.texto && !U.contiene([t.titulo, t.detalle, t.notas].join(' '), filtros.texto)) return false;
      return true;
    }));
  }

  function render(cont) {
    var registros = filtrar();

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Tareas</h1><p>Tus pendientes, con o sin solicitud de por medio.</p></div>' +
        '<div class="derecha">' +
          '<button class="btn" id="exportar">⤓ Exportar a Excel</button>' +
          '<button class="btn btn-primario" id="nueva">+ Nueva tarea</button>' +
        '</div>' +
      '</div>' +
      '<div class="filtros">' +
        '<select id="f-estado">' +
          op('abiertas', 'Sin terminar', filtros.estado) +
          op('', 'Todas', filtros.estado) +
          op('pendiente', 'Pendientes', filtros.estado) +
          op('en_proceso', 'En proceso', filtros.estado) +
          op('hecha', 'Hechas', filtros.estado) +
        '</select>' +
        '<select id="f-prioridad">' +
          op('', 'Cualquier prioridad', filtros.prioridad) +
          op('alta', 'Alta', filtros.prioridad) +
          op('media', 'Media', filtros.prioridad) +
          op('baja', 'Baja', filtros.prioridad) +
        '</select>' +
        '<input type="search" id="f-texto" placeholder="Filtrar por texto…" value="' + U.esc(filtros.texto) + '">' +
        '<button class="btn btn-mini" id="f-limpiar">Limpiar</button>' +
      '</div>' +
      '<div class="tarjeta"><div class="tabla-envoltura">' + tabla(registros) + '</div></div>';

    cont.querySelector('#nueva').onclick = function () { formulario(); };
    cont.querySelector('#exportar').onclick = function () { exportar(registros); };

    cont.querySelector('#f-estado').onchange = function () { filtros.estado = this.value; App.recargar(); };
    cont.querySelector('#f-prioridad').onchange = function () { filtros.prioridad = this.value; App.recargar(); };
    var texto = cont.querySelector('#f-texto');
    texto.oninput = U.retardo(function () {
      filtros.texto = texto.value;
      App.recargar();
      var nuevo = document.querySelector('#f-texto');
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length); }
    }, 300);
    cont.querySelector('#f-limpiar').onclick = function () {
      filtros = { estado: 'abiertas', prioridad: '', texto: '' };
      App.recargar();
    };

    conectarFilas(cont);
  }

  function op(valor, texto, actual) {
    return '<option value="' + U.esc(valor) + '"' + (actual === valor ? ' selected' : '') + '>' + U.esc(texto) + '</option>';
  }

  function tabla(registros) {
    if (!registros.length) {
      return '<div class="vacio"><strong>Sin tareas por aquí</strong>Agrega lo que tengas que hacer con «+ Nueva tarea».</div>';
    }
    return '<table><thead><tr>' +
      '<th style="width:34px"></th><th>Tarea</th><th>Para</th><th>Prioridad</th><th>Estado</th><th>Vence</th><th></th>' +
      '</tr></thead><tbody>' + registros.map(fila).join('') + '</tbody></table>';
  }

  function fila(t) {
    var vence = '<span class="secundario">—</span>';
    if (t.vence) {
      var dias = U.diasHasta(t.vence);
      var clase = t.estado === 'hecha' ? 'et-hecha' : (dias < 0 ? 'et-vencida' : (dias <= 1 ? 'et-alta' : 'et-baja'));
      vence = '<span class="etiqueta ' + clase + '">' + U.esc(U.textoVencimiento(t.vence)) + '</span>' +
              '<span class="secundario">' + U.fechaCorta(t.vence) + '</span>';
    }
    var solicitud = t.solicitudId && Almacen.buscarPorId('solicitudes', t.solicitudId);
    var quien = t.contactoId ? Contactos.nombre(t.contactoId) : '';

    return '<tr>' +
      '<td><input type="checkbox" data-marcar="' + t.id + '"' + (t.estado === 'hecha' ? ' checked' : '') + '></td>' +
      '<td><div class="principal-celda"' + (t.estado === 'hecha' ? ' style="text-decoration:line-through;color:#8a97a8"' : '') + '>' +
        U.esc(t.titulo) + '</div>' +
        (t.detalle ? '<div class="recorte secundario">' + U.esc(t.detalle) + '</div>' : '') +
        (solicitud ? '<span class="secundario">↳ de la solicitud: ' + U.esc(U.recortar(solicitud.asunto, 40)) + '</span>' : '') +
      '</td>' +
      '<td>' + U.esc(quien || '—') + '</td>' +
      '<td>' + U.etiqueta(t.prioridad || 'media') + '</td>' +
      '<td>' + U.etiqueta(t.estado || 'pendiente') + '</td>' +
      '<td>' + vence + '</td>' +
      '<td class="acciones">' +
        (t.estado === 'pendiente' ? '<button class="btn btn-mini" data-proceso="' + t.id + '">Iniciar</button>' : '') +
        '<button class="btn btn-mini" data-editar="' + t.id + '">Editar</button>' +
        '<button class="btn btn-mini btn-peligro" data-eliminar="' + t.id + '">✕</button>' +
      '</td>' +
    '</tr>';
  }

  function conectarFilas(cont) {
    cont.querySelectorAll('[data-marcar]').forEach(function (c) {
      c.onchange = function () {
        var t = Almacen.buscarPorId('tareas', c.dataset.marcar);
        if (c.checked) {
          Almacen.actualizar('tareas', t.id, { estado: 'hecha', completado: new Date().toISOString() });
          if (t.solicitudId) {
            var s = Almacen.buscarPorId('solicitudes', t.solicitudId);
            if (s && s.estado !== 'resuelta' && confirm('¿Marcar también como resuelta la solicitud «' + s.asunto + '»?')) {
              Almacen.actualizar('solicitudes', s.id, { estado: 'resuelta' });
            }
          }
          U.aviso('Tarea completada', 'ok');
        } else {
          Almacen.actualizar('tareas', t.id, { estado: 'pendiente', completado: '' });
        }
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-proceso]').forEach(function (b) {
      b.onclick = function () {
        Almacen.actualizar('tareas', b.dataset.proceso, { estado: 'en_proceso' });
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-editar]').forEach(function (b) {
      b.onclick = function () { formulario(Almacen.buscarPorId('tareas', b.dataset.editar)); };
    });
    cont.querySelectorAll('[data-eliminar]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Eliminar esta tarea?')) return;
        Almacen.eliminar('tareas', b.dataset.eliminar);
        U.aviso('Tarea eliminada');
        App.recargar();
      };
    });
  }

  function formulario(registro) {
    registro = registro || null;
    App.modal({
      titulo: registro ? 'Editar tarea' : 'Nueva tarea',
      cuerpo:
        Contactos.datalistHTML('lista-contactos-t') +
        App.campo({ etiqueta: 'Tarea', nombre: 'titulo', valor: registro && registro.titulo, requerido: true,
                    atributos: 'placeholder="Qué hay que hacer"' }) +
        App.campo({ etiqueta: 'Detalle', nombre: 'detalle', tipo: 'textarea', valor: registro && registro.detalle }) +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Quién lo pidió (opcional)', nombre: 'solicitante',
                      valor: registro && registro.contactoId ? Contactos.nombre(registro.contactoId) : '',
                      atributos: 'list="lista-contactos-t"' }) +
          App.campo({ etiqueta: 'Vence', nombre: 'vence', tipo: 'date', valor: registro && registro.vence }) +
        '</div>' +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Prioridad', nombre: 'prioridad', tipo: 'select',
                      opciones: [{ valor: 'alta', texto: 'Alta' }, { valor: 'media', texto: 'Media' }, { valor: 'baja', texto: 'Baja' }],
                      valor: (registro && registro.prioridad) || 'media' }) +
          App.campo({ etiqueta: 'Estado', nombre: 'estado', tipo: 'select',
                      opciones: [{ valor: 'pendiente', texto: 'Pendiente' }, { valor: 'en_proceso', texto: 'En proceso' }, { valor: 'hecha', texto: 'Hecha' }],
                      valor: (registro && registro.estado) || 'pendiente' }) +
        '</div>' +
        App.campo({ etiqueta: 'Notas', nombre: 'notas', tipo: 'textarea', valor: registro && registro.notas }),
      alGuardar: function (v) {
        if (!v.titulo.trim()) { U.aviso('El título es obligatorio', 'error'); return false; }
        v.contactoId = v.solicitante ? Contactos.asegurar(v.solicitante) : '';
        delete v.solicitante;
        if (v.estado === 'hecha' && (!registro || registro.estado !== 'hecha')) v.completado = new Date().toISOString();
        if (registro) Almacen.actualizar('tareas', registro.id, v);
        else Almacen.agregar('tareas', v);
        U.aviso('Tarea guardada', 'ok');
        App.recargar();
      }
    });
  }

  function exportar(registros) {
    registros = registros || filtrar();
    if (!registros.length) { U.aviso('No hay tareas para exportar', 'error'); return; }

    XLSX.descargar('Tareas_' + U.hoyISO() + '.xlsx', [{
      nombre: 'Tareas',
      titulo: 'Tareas — generado el ' + U.fechaCorta(U.hoyISO()),
      columnas: ['Tarea', 'Detalle', 'Solicitada por', 'Prioridad', 'Estado', 'Vence', 'Creada', 'Completada', 'Notas'],
      anchos: [36, 46, 20, 11, 12, 13, 13, 13, 30],
      filas: registros.map(function (t) {
        return [
          t.titulo || '', t.detalle || '', t.contactoId ? Contactos.nombre(t.contactoId) : '',
          U.ETIQUETAS[t.prioridad] || '', U.ETIQUETAS[t.estado] || '',
          t.vence ? U.fechaCorta(t.vence) : '',
          t.creado ? U.fechaCorta(t.creado) : '',
          t.completado ? U.fechaCorta(t.completado) : '',
          t.notas || ''
        ];
      }),
      totales: [
        ['Total de tareas', registros.length],
        ['Sin terminar', registros.filter(function (t) { return t.estado !== 'hecha'; }).length]
      ]
    }]);
    U.aviso('Excel generado', 'ok');
  }

  return {
    render: render, formulario: formulario, todas: todas, abiertas: abiertas,
    vencidas: vencidas, paraHoy: paraHoy, ordenar: ordenar, exportar: exportar
  };
})();

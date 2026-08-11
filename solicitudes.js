var Solicitudes = (function () {

  var filtros = { estado: 'abiertas', prioridad: '', contacto: '', texto: '' };

  var CANALES = ['WhatsApp', 'Llamada', 'Correo', 'En persona', 'Otro'];

  function todas() {
    return Almacen.lista('solicitudes');
  }

  function abiertas() {
    return todas().filter(function (s) { return s.estado !== 'resuelta'; });
  }

  var ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };

  function ordenar(arr) {
    return arr.slice().sort(function (a, b) {
      var pa = ORDEN_PRIORIDAD[a.prioridad] !== undefined ? ORDEN_PRIORIDAD[a.prioridad] : 3;
      var pb = ORDEN_PRIORIDAD[b.prioridad] !== undefined ? ORDEN_PRIORIDAD[b.prioridad] : 3;
      if (pa !== pb) return pa - pb;
      return (b.creado || '') < (a.creado || '') ? -1 : 1;
    });
  }

  function filtrar() {
    return ordenar(todas().filter(function (s) {
      if (filtros.estado === 'abiertas' && s.estado === 'resuelta') return false;
      if (filtros.estado && filtros.estado !== 'abiertas' && s.estado !== filtros.estado) return false;
      if (filtros.prioridad && s.prioridad !== filtros.prioridad) return false;
      if (filtros.contacto && s.contactoId !== filtros.contacto) return false;
      if (filtros.texto) {
        var blob = [s.asunto, s.mensaje, s.notas, s.solicitante, s.canal].join(' ');
        if (!U.contiene(blob, filtros.texto)) return false;
      }
      return true;
    }));
  }

  function render(cont) {
    var registros = filtrar();

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Solicitudes</h1><p>Lo que te piden por WhatsApp y otros canales.</p></div>' +
        '<div class="derecha">' +
          '<button class="btn" id="exportar">⤓ Exportar a Excel</button>' +
          '<button class="btn btn-primario" id="nueva">+ Nueva solicitud</button>' +
        '</div>' +
      '</div>' +
      barraFiltros() +
      '<div class="tarjeta"><div class="tabla-envoltura">' + tabla(registros) + '</div></div>';

    cont.querySelector('#nueva').onclick = function () { formulario(); };
    cont.querySelector('#exportar').onclick = function () { exportar(registros); };
    conectarFiltros(cont);
    conectarFilas(cont);
  }

  function barraFiltros() {
    return '<div class="filtros">' +
      '<select id="f-estado">' +
        opcion('abiertas', 'Sin resolver', filtros.estado) +
        opcion('', 'Todas', filtros.estado) +
        opcion('pendiente', 'Pendientes', filtros.estado) +
        opcion('en_proceso', 'En proceso', filtros.estado) +
        opcion('resuelta', 'Resueltas', filtros.estado) +
      '</select>' +
      '<select id="f-prioridad">' +
        opcion('', 'Cualquier prioridad', filtros.prioridad) +
        opcion('alta', 'Prioridad alta', filtros.prioridad) +
        opcion('media', 'Prioridad media', filtros.prioridad) +
        opcion('baja', 'Prioridad baja', filtros.prioridad) +
      '</select>' +
      '<select id="f-contacto">' +
        opcion('', 'Cualquier solicitante', filtros.contacto) +
        Contactos.todos().map(function (c) {
          return opcion(c.id, c.nombre, filtros.contacto);
        }).join('') +
      '</select>' +
      '<input type="search" id="f-texto" placeholder="Filtrar por texto…" value="' + U.esc(filtros.texto) + '">' +
      '<button class="btn btn-mini" id="f-limpiar">Limpiar</button>' +
    '</div>';
  }

  function opcion(valor, texto, actual) {
    return '<option value="' + U.esc(valor) + '"' + (actual === valor ? ' selected' : '') + '>' + U.esc(texto) + '</option>';
  }

  function conectarFiltros(cont) {
    cont.querySelector('#f-estado').onchange = function () { filtros.estado = this.value; App.recargar(); };
    cont.querySelector('#f-prioridad').onchange = function () { filtros.prioridad = this.value; App.recargar(); };
    cont.querySelector('#f-contacto').onchange = function () { filtros.contacto = this.value; App.recargar(); };
    var texto = cont.querySelector('#f-texto');
    texto.oninput = U.retardo(function () {
      filtros.texto = texto.value;
      App.recargar();
      var nuevo = document.querySelector('#f-texto');
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length); }
    }, 300);
    cont.querySelector('#f-limpiar').onclick = function () {
      filtros = { estado: 'abiertas', prioridad: '', contacto: '', texto: '' };
      App.recargar();
    };
  }

  function tabla(registros) {
    if (!registros.length) {
      return '<div class="vacio"><strong>No hay solicitudes con estos filtros</strong>' +
             'Usa «+ Nueva solicitud» o pega directamente el mensaje de WhatsApp.</div>';
    }
    return '<table><thead><tr>' +
      '<th>Recibida</th><th>Solicitante</th><th>Asunto</th><th>Prioridad</th><th>Estado</th><th>Compromiso</th><th></th>' +
      '</tr></thead><tbody>' +
      registros.map(fila).join('') +
      '</tbody></table>';
  }

  function fila(s) {
    var vence = '';
    if (s.vence) {
      var dias = U.diasHasta(s.vence);
      var clase = dias < 0 ? 'et-vencida' : (dias <= 1 ? 'et-alta' : 'et-baja');
      vence = '<span class="etiqueta ' + clase + '">' + U.esc(U.textoVencimiento(s.vence)) + '</span>' +
              '<span class="secundario">' + U.fechaCorta(s.vence) + '</span>';
    } else {
      vence = '<span class="secundario">—</span>';
    }

    var tarea = s.tareaId && Almacen.buscarPorId('tareas', s.tareaId);

    return '<tr>' +
      '<td>' + U.fechaCorta(s.fecha || s.creado) +
        '<span class="secundario">' + U.esc(s.canal || '') + '</span></td>' +
      '<td class="principal-celda">' + U.esc(s.solicitante || '—') +
        (s.telefono ? '<span class="secundario">' + U.esc(s.telefono) + '</span>' : '') + '</td>' +
      '<td><div class="principal-celda">' + U.esc(s.asunto || '(sin asunto)') + '</div>' +
        (s.mensaje ? '<div class="recorte secundario">' + U.esc(s.mensaje) + '</div>' : '') +
        (tarea ? '<span class="secundario">↳ tarea: ' + U.esc(U.recortar(tarea.titulo, 40)) + '</span>' : '') + '</td>' +
      '<td>' + U.etiqueta(s.prioridad || 'media') + '</td>' +
      '<td>' + U.etiqueta(s.estado || 'pendiente') + '</td>' +
      '<td>' + vence + '</td>' +
      '<td class="acciones">' +
        (s.estado !== 'resuelta'
          ? '<button class="btn btn-mini" data-avanzar="' + s.id + '">' +
              (s.estado === 'en_proceso' ? 'Resolver' : 'Iniciar') + '</button>'
          : '<button class="btn btn-mini" data-reabrir="' + s.id + '">Reabrir</button>') +
        (!s.tareaId ? '<button class="btn btn-mini" data-atarea="' + s.id + '">→ Tarea</button>' : '') +
        '<button class="btn btn-mini" data-editar="' + s.id + '">Editar</button>' +
        '<button class="btn btn-mini btn-peligro" data-eliminar="' + s.id + '">✕</button>' +
      '</td>' +
    '</tr>';
  }

  function conectarFilas(cont) {
    cont.querySelectorAll('[data-avanzar]').forEach(function (b) {
      b.onclick = function () {
        var s = Almacen.buscarPorId('solicitudes', b.dataset.avanzar);
        var nuevo = s.estado === 'en_proceso' ? 'resuelta' : 'en_proceso';
        Almacen.actualizar('solicitudes', s.id, { estado: nuevo });
        U.aviso('Solicitud marcada como ' + U.ETIQUETAS[nuevo].toLowerCase(), 'ok');
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-reabrir]').forEach(function (b) {
      b.onclick = function () {
        Almacen.actualizar('solicitudes', b.dataset.reabrir, { estado: 'pendiente' });
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-atarea]').forEach(function (b) {
      b.onclick = function () { convertirEnTarea(b.dataset.atarea); };
    });
    cont.querySelectorAll('[data-editar]').forEach(function (b) {
      b.onclick = function () { formulario(Almacen.buscarPorId('solicitudes', b.dataset.editar)); };
    });
    cont.querySelectorAll('[data-eliminar]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Eliminar esta solicitud? No se puede deshacer.')) return;
        Almacen.eliminar('solicitudes', b.dataset.eliminar);
        U.aviso('Solicitud eliminada');
        App.recargar();
      };
    });
  }

  function formulario(registro) {
    registro = registro || null;
    var listaCanales = CANALES.map(function (c) {
      return { valor: c, texto: c };
    });

    App.modal({
      titulo: registro ? 'Editar solicitud' : 'Nueva solicitud',
      cuerpo:
        Contactos.datalistHTML('lista-contactos') +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Solicitante', nombre: 'solicitante', valor: registro && registro.solicitante,
                      requerido: true, atributos: 'list="lista-contactos" placeholder="Nombre de quien pide"' }) +
          App.campo({ etiqueta: 'Teléfono (opcional)', nombre: 'telefono', valor: registro && registro.telefono }) +
        '</div>' +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Canal', nombre: 'canal', tipo: 'select', opciones: listaCanales,
                      valor: (registro && registro.canal) || 'WhatsApp' }) +
          App.campo({ etiqueta: 'Fecha en que llegó', nombre: 'fecha', tipo: 'date',
                      valor: (registro && registro.fecha) || U.hoyISO() }) +
        '</div>' +
        App.campo({ etiqueta: 'Asunto', nombre: 'asunto', valor: registro && registro.asunto, requerido: true,
                    atributos: 'placeholder="Resumen corto: qué piden"' }) +
        App.campo({ etiqueta: 'Mensaje recibido', nombre: 'mensaje', tipo: 'textarea', valor: registro && registro.mensaje,
                    atributos: 'placeholder="Pega aquí el mensaje de WhatsApp tal cual"',
                    ayuda: 'Puedes pegar el mensaje completo; se guarda íntegro y es buscable.' }) +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Prioridad', nombre: 'prioridad', tipo: 'select',
                      opciones: [{ valor: 'alta', texto: 'Alta' }, { valor: 'media', texto: 'Media' }, { valor: 'baja', texto: 'Baja' }],
                      valor: (registro && registro.prioridad) || 'media' }) +
          App.campo({ etiqueta: 'Estado', nombre: 'estado', tipo: 'select',
                      opciones: [{ valor: 'pendiente', texto: 'Pendiente' }, { valor: 'en_proceso', texto: 'En proceso' }, { valor: 'resuelta', texto: 'Resuelta' }],
                      valor: (registro && registro.estado) || 'pendiente' }) +
          App.campo({ etiqueta: 'Comprometida para', nombre: 'vence', tipo: 'date', valor: registro && registro.vence }) +
        '</div>' +
        App.campo({ etiqueta: 'Notas internas', nombre: 'notas', tipo: 'textarea', valor: registro && registro.notas }),
      alGuardar: function (v) {
        if (!v.solicitante.trim() || !v.asunto.trim()) {
          U.aviso('Solicitante y asunto son obligatorios', 'error');
          return false;
        }
        v.contactoId = Contactos.asegurar(v.solicitante);
        if (v.telefono) {
          var c = Almacen.buscarPorId('contactos', v.contactoId);
          if (c && !c.telefono) Almacen.actualizar('contactos', c.id, { telefono: v.telefono });
        }
        if (registro) Almacen.actualizar('solicitudes', registro.id, v);
        else Almacen.agregar('solicitudes', v);
        U.aviso('Solicitud guardada', 'ok');
        App.recargar();
      }
    });
  }

  function convertirEnTarea(idSolicitud) {
    var s = Almacen.buscarPorId('solicitudes', idSolicitud);
    if (!s) return;
    var tarea = Almacen.agregar('tareas', {
      titulo: s.asunto,
      detalle: s.mensaje || '',
      prioridad: s.prioridad || 'media',
      estado: 'pendiente',
      vence: s.vence || '',
      contactoId: s.contactoId || '',
      solicitudId: s.id
    });
    Almacen.actualizar('solicitudes', s.id, { tareaId: tarea.id, estado: s.estado === 'pendiente' ? 'en_proceso' : s.estado });
    U.aviso('Tarea creada desde la solicitud', 'ok');
    App.recargar();
  }

  function exportar(registros) {
    registros = registros || filtrar();
    if (!registros.length) { U.aviso('No hay solicitudes para exportar', 'error'); return; }

    XLSX.descargar('Solicitudes_' + U.hoyISO() + '.xlsx', [{
      nombre: 'Solicitudes',
      titulo: 'Solicitudes — generado el ' + U.fechaCorta(U.hoyISO()),
      columnas: ['Fecha', 'Canal', 'Solicitante', 'Teléfono', 'Asunto', 'Mensaje', 'Prioridad', 'Estado', 'Compromiso', 'Notas'],
      anchos: [12, 12, 22, 15, 34, 52, 11, 12, 13, 34],
      filas: registros.map(function (s) {
        return [
          U.fechaCorta(s.fecha || s.creado), s.canal || '', s.solicitante || '', s.telefono || '',
          s.asunto || '', s.mensaje || '',
          U.ETIQUETAS[s.prioridad] || '', U.ETIQUETAS[s.estado] || '',
          s.vence ? U.fechaCorta(s.vence) : '', s.notas || ''
        ];
      }),
      totales: [
        ['Total de solicitudes', registros.length],
        ['Sin resolver', registros.filter(function (s) { return s.estado !== 'resuelta'; }).length]
      ]
    }]);
    U.aviso('Excel generado', 'ok');
  }

  return {
    render: render, formulario: formulario, todas: todas, abiertas: abiertas,
    ordenar: ordenar, exportar: exportar, convertirEnTarea: convertirEnTarea
  };
})();

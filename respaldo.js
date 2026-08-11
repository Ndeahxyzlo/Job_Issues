var Respaldo = (function () {

  function render(cont) {
    var t = Almacen.totales();

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Respaldo</h1><p>Tus datos viven en este navegador, en esta computadora. Respáldalos seguido.</p></div>' +
      '</div>' +

      '<div class="aviso-linea">' +
        '<span>ℹ</span>' +
        '<div>Si limpias el historial o los datos de navegación de Edge/Chrome, la información se borra. ' +
        'Descarga un respaldo al menos una vez por semana y guárdalo en una carpeta o en la nube.</div>' +
      '</div>' +

      '<div class="rejilla rejilla-4" style="margin-bottom:18px">' +
        metrica(t.solicitudes, 'Solicitudes') +
        metrica(t.tareas, 'Tareas') +
        metrica(t.transportes, 'Registros de transporte') +
        metrica(t.contactos, 'Contactos') +
      '</div>' +

      '<div class="rejilla rejilla-2">' +
        '<div class="tarjeta">' +
          '<div class="tarjeta-cabecera"><h2>Guardar respaldo</h2></div>' +
          '<div class="tarjeta-cuerpo">' +
            '<p>Descarga un archivo <code>.json</code> con absolutamente todo. Sirve para restaurar o para pasar los datos a otra computadora.</p>' +
            '<button class="btn btn-primario" id="descargar-json">⤓ Descargar respaldo (.json)</button>' +
          '</div>' +
        '</div>' +

        '<div class="tarjeta">' +
          '<div class="tarjeta-cabecera"><h2>Restaurar</h2></div>' +
          '<div class="tarjeta-cuerpo">' +
            '<p>Carga un archivo de respaldo. Puedes <strong>combinar</strong> con lo que ya tienes o <strong>reemplazar</strong> todo.</p>' +
            '<div class="campo"><input type="file" id="archivo-json" accept=".json,application/json"></div>' +
            '<button class="btn" id="combinar">Combinar con lo actual</button> ' +
            '<button class="btn btn-peligro" id="reemplazar">Reemplazar todo</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="tarjeta">' +
        '<div class="tarjeta-cabecera"><h2>Exportar a Excel</h2></div>' +
        '<div class="tarjeta-cuerpo">' +
          '<p>Un solo archivo con todas las hojas, o cada módulo por separado desde su propia pantalla.</p>' +
          '<button class="btn btn-primario" id="excel-todo">⤓ Exportar todo a Excel</button> ' +
          '<button class="btn btn-primario" id="excel-relacion">⤓ Relación de gastos (todo)</button> ' +
          '<button class="btn" id="excel-solicitudes">Solo solicitudes</button> ' +
          '<button class="btn" id="excel-tareas">Solo tareas</button> ' +
          '<button class="btn" id="excel-transportes">Solo transportes</button>' +
        '</div>' +
      '</div>' +

      '<div class="tarjeta">' +
        '<div class="tarjeta-cabecera"><h2>Zona de riesgo</h2></div>' +
        '<div class="tarjeta-cuerpo">' +
          '<p>Borra absolutamente todos los registros de este equipo. No se puede deshacer.</p>' +
          '<button class="btn btn-peligro" id="borrar-todo">Borrar todos los datos</button>' +
        '</div>' +
      '</div>';

    conectar(cont);
  }

  function metrica(valor, etiqueta) {
    return '<div class="metrica"><div class="etiqueta">' + U.esc(etiqueta) + '</div>' +
           '<div class="valor">' + valor + '</div></div>';
  }

  function conectar(cont) {
    cont.querySelector('#descargar-json').onclick = descargarJSON;

    cont.querySelector('#combinar').onclick = function () { restaurar(cont, false); };
    cont.querySelector('#reemplazar').onclick = function () { restaurar(cont, true); };

    cont.querySelector('#excel-todo').onclick = exportarTodo;
    cont.querySelector('#excel-solicitudes').onclick = function () { Solicitudes.exportar(Almacen.lista('solicitudes')); };
    cont.querySelector('#excel-tareas').onclick = function () { Tareas.exportar(Almacen.lista('tareas')); };
    cont.querySelector('#excel-transportes').onclick = function () {
      Transportes.exportar(Transportes.ordenar(Almacen.lista('transportes')), { desde: '', hasta: '' });
    };
    cont.querySelector('#excel-relacion').onclick = function () {
      Transportes.exportarRelacion(Transportes.ordenar(Almacen.lista('transportes')), { desde: '', hasta: '' });
    };

    cont.querySelector('#borrar-todo').onclick = function () {
      if (!confirm('Se borrarán TODOS los datos de este equipo. ¿Continuar?')) return;
      if (!confirm('Última confirmación: esto no se puede deshacer. ¿Seguro?')) return;
      Almacen.reemplazarTodo({});
      U.aviso('Todos los datos fueron borrados');
      App.ir('inicio');
    };
  }

  function descargarJSON() {
    var nombre = 'Respaldo_Organizador_' + U.hoyISO() + '.json';
    U.descargar(nombre, new Blob([Almacen.exportarJSON()], { type: 'application/json' }));
    U.aviso('Respaldo descargado', 'ok');
  }

  function restaurar(cont, reemplazar) {
    var input = cont.querySelector('#archivo-json');
    var archivo = input.files && input.files[0];
    if (!archivo) { U.aviso('Primero elige un archivo de respaldo', 'error'); return; }
    if (reemplazar && !confirm('Se reemplazarán todos los datos actuales por los del archivo. ¿Continuar?')) return;

    var lector = new FileReader();
    lector.onload = function () {
      var datos;
      try {
        datos = JSON.parse(lector.result);
      } catch (e) {
        U.aviso('El archivo no es un respaldo válido', 'error');
        return;
      }
      if (reemplazar) {
        Almacen.reemplazarTodo(datos);
      } else {
        combinar(datos);
      }
      U.aviso('Respaldo restaurado', 'ok');
      App.ir('inicio');
    };
    lector.readAsText(archivo);
  }

  function combinar(nuevos) {
    Almacen.COLECCIONES.forEach(function (col) {
      if (!Array.isArray(nuevos[col])) return;
      var existentes = {};
      Almacen.lista(col).forEach(function (r) { existentes[r.id] = true; });
      nuevos[col].forEach(function (r) {
        if (r && r.id && !existentes[r.id]) Almacen.datos[col].push(r);
      });
    });
    Almacen.guardar();
  }

  function exportarTodo() {
    var solicitudes = Almacen.lista('solicitudes');
    var tareas = Almacen.lista('tareas');
    var transportes = Transportes.ordenar(Almacen.lista('transportes')).reverse();
    var contactos = Contactos.todos();

    if (!solicitudes.length && !tareas.length && !transportes.length) {
      U.aviso('Todavía no hay nada que exportar', 'error');
      return;
    }

    var hojas = [
      {
        nombre: 'Solicitudes',
        titulo: 'Solicitudes',
        columnas: ['Fecha', 'Canal', 'Solicitante', 'Teléfono', 'Asunto', 'Mensaje', 'Prioridad', 'Estado', 'Compromiso', 'Notas'],
        anchos: [12, 12, 22, 15, 34, 52, 11, 12, 13, 30],
        filas: solicitudes.map(function (s) {
          return [U.fechaCorta(s.fecha || s.creado), s.canal || '', s.solicitante || '', s.telefono || '',
                  s.asunto || '', s.mensaje || '', U.ETIQUETAS[s.prioridad] || '', U.ETIQUETAS[s.estado] || '',
                  s.vence ? U.fechaCorta(s.vence) : '', s.notas || ''];
        }),
        totales: [['Total', solicitudes.length]]
      },
      {
        nombre: 'Tareas',
        titulo: 'Tareas',
        columnas: ['Tarea', 'Detalle', 'Solicitada por', 'Prioridad', 'Estado', 'Vence', 'Creada', 'Completada'],
        anchos: [36, 46, 20, 11, 12, 13, 13, 13],
        filas: tareas.map(function (t) {
          return [t.titulo || '', t.detalle || '', t.contactoId ? Contactos.nombre(t.contactoId) : '',
                  U.ETIQUETAS[t.prioridad] || '', U.ETIQUETAS[t.estado] || '',
                  t.vence ? U.fechaCorta(t.vence) : '', t.creado ? U.fechaCorta(t.creado) : '',
                  t.completado ? U.fechaCorta(t.completado) : ''];
        }),
        totales: [['Total', tareas.length]]
      },
      {
        nombre: 'Transportes',
        titulo: 'Control de transportes',
        columnas: ['Fecha', 'Hora salida', 'Hora entrada', 'Tiempo fuera', 'Minutos', 'Origen', 'Destino', 'Detalle', 'Valor', 'Notas'],
        anchos: [12, 12, 13, 13, 10, 30, 30, 42, 12, 28],
        filas: transportes.map(function (t) {
          var m = Transportes.minutos(t);
          return [XLSX.fecha(t.fecha), t.horaSalida || '', t.horaEntrada || (t.horaSalida ? 'Sin registrar' : ''),
                  m !== null ? U.duracion(m) : '', m !== null ? m : '',
                  t.origen || '', t.destino || '', Transportes.detalle(t), Number(t.valor) || 0, t.notas || ''];
        }),
        totales: [
          ['Total de tramos', transportes.length],
          ['Gasto de transporte', Transportes.totalValor(transportes)]
        ]
      },
      {
        nombre: 'Directorio',
        titulo: 'Directorio de solicitantes',
        columnas: ['Nombre', 'Área', 'Teléfono', 'Notas'],
        anchos: [26, 24, 18, 40],
        filas: contactos.map(function (c) {
          return [c.nombre || '', c.area || '', c.telefono || '', c.notas || ''];
        })
      }
    ];

    XLSX.descargar('Organizador_completo_' + U.hoyISO() + '.xlsx', hojas);
    U.aviso('Excel generado', 'ok');
  }

  return { render: render, descargarJSON: descargarJSON, exportarTodo: exportarTodo };
})();

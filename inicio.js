var Inicio = (function () {

  function render(cont) {
    var solicitudesAbiertas = Solicitudes.abiertas();
    var urgentes = solicitudesAbiertas.filter(function (s) { return s.prioridad === 'alta'; });
    var tareasAbiertas = Tareas.abiertas();
    var vencidas = Tareas.vencidas();
    var hoyTareas = Tareas.paraHoy();
    var salidasAbiertas = Transportes.abiertas();
    var salidasHoy = Transportes.todos().filter(function (t) { return t.fecha === U.hoyISO(); });

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Hola, buen día</h1><p>' + U.esc(U.fechaLarga(U.hoyISO())) + '</p></div>' +
      '</div>' +

      (salidasAbiertas.length ? avisoSalida(salidasAbiertas) : '') +
      (vencidas.length ? avisoVencidas(vencidas) : '') +

      '<div class="rejilla rejilla-4" style="margin-bottom:18px">' +
        metrica(solicitudesAbiertas.length, 'Solicitudes sin resolver',
                urgentes.length ? urgentes.length + ' de prioridad alta' : 'Ninguna urgente',
                urgentes.length ? 'acento-alta' : '') +
        metrica(tareasAbiertas.length, 'Tareas pendientes',
                hoyTareas.length ? hoyTareas.length + ' vencen hoy' : '',
                hoyTareas.length ? 'acento-alerta' : '') +
        metrica(vencidas.length, 'Tareas vencidas', vencidas.length ? 'Atrasadas' : 'Al día',
                vencidas.length ? 'acento-alta' : 'acento-ok') +
        metrica(salidasHoy.length, 'Salidas de hoy',
                salidasAbiertas.length ? salidasAbiertas.length + ' sin cerrar' : 'Todas cerradas',
                salidasAbiertas.length ? 'acento-alerta' : 'acento-ok') +
      '</div>' +

      '<div class="rejilla rejilla-2">' +
        panelSolicitudes(solicitudesAbiertas) +
        panelTareas(tareasAbiertas) +
      '</div>' +

      panelTransportes(salidasHoy);

    conectar(cont);
  }

  function metrica(valor, etiqueta, pie, clase) {
    return '<div class="metrica ' + (clase || '') + '">' +
      '<div class="etiqueta">' + U.esc(etiqueta) + '</div>' +
      '<div class="valor">' + U.esc(valor) + '</div>' +
      (pie ? '<div class="pie">' + U.esc(pie) + '</div>' : '') +
    '</div>';
  }

  function avisoSalida(salidas) {
    var t = salidas[0];
    return '<div class="aviso-linea">' +
      '<span>⚠</span>' +
      '<div>Salida sin registrar el regreso: <strong>' + U.esc(t.destino || 'sin destino') + '</strong>' +
      ' del ' + U.fechaCorta(t.fecha) + ' a las ' + U.esc(t.horaSalida) + '.</div>' +
      '<button class="btn btn-mini" data-cerrar-salida="' + t.id + '">Registrar regreso</button>' +
    '</div>';
  }

  function avisoVencidas(vencidas) {
    return '<div class="aviso-linea">' +
      '<span>⏰</span>' +
      '<div>Tienes <strong>' + vencidas.length + '</strong> tarea' + (vencidas.length > 1 ? 's' : '') +
      ' con la fecha ya pasada.</div>' +
      '<button class="btn btn-mini" data-ir="tareas">Ver tareas</button>' +
    '</div>';
  }

  function panelSolicitudes(abiertas) {
    var lista = Solicitudes.ordenar(abiertas).slice(0, 6);
    return '<div class="tarjeta">' +
      '<div class="tarjeta-cabecera"><h2>Solicitudes por atender</h2>' +
        '<div class="derecha"><button class="btn btn-mini" data-ir="solicitudes">Ver todas</button></div></div>' +
      (lista.length
        ? '<div class="tabla-envoltura"><table><tbody>' + lista.map(function (s) {
            return '<tr>' +
              '<td><div class="principal-celda">' + U.esc(U.recortar(s.asunto, 52)) + '</div>' +
                '<span class="secundario">' + U.esc(s.solicitante || '') +
                (s.canal ? ' · ' + U.esc(s.canal) : '') + ' · ' + U.fechaCorta(s.fecha || s.creado) + '</span></td>' +
              '<td style="width:1%">' + U.etiqueta(s.prioridad || 'media') + '</td>' +
              '<td class="acciones" style="width:1%">' +
                '<button class="btn btn-mini" data-avanzar="' + s.id + '">' +
                (s.estado === 'en_proceso' ? 'Resolver' : 'Iniciar') + '</button></td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="vacio"><strong>Todo atendido</strong>No hay solicitudes sin resolver.</div>') +
    '</div>';
  }

  function panelTareas(abiertas) {
    var lista = Tareas.ordenar(abiertas).slice(0, 6);
    return '<div class="tarjeta">' +
      '<div class="tarjeta-cabecera"><h2>Pendientes</h2>' +
        '<div class="derecha"><button class="btn btn-mini" data-ir="tareas">Ver todas</button></div></div>' +
      (lista.length
        ? '<div class="tabla-envoltura"><table><tbody>' + lista.map(function (t) {
            var venc = '';
            if (t.vence) {
              var dias = U.diasHasta(t.vence);
              var clase = dias < 0 ? 'et-vencida' : (dias <= 1 ? 'et-alta' : 'et-baja');
              venc = '<span class="etiqueta ' + clase + '">' + U.esc(U.textoVencimiento(t.vence)) + '</span>';
            }
            return '<tr>' +
              '<td style="width:1%"><input type="checkbox" data-marcar="' + t.id + '"></td>' +
              '<td><div class="principal-celda">' + U.esc(U.recortar(t.titulo, 52)) + '</div>' +
                (t.contactoId ? '<span class="secundario">Pedido por ' + U.esc(Contactos.nombre(t.contactoId)) + '</span>' : '') + '</td>' +
              '<td style="width:1%">' + U.etiqueta(t.prioridad || 'media') + '</td>' +
              '<td style="width:1%">' + venc + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="vacio"><strong>Sin pendientes</strong>No tienes tareas abiertas.</div>') +
    '</div>';
  }

  function panelTransportes(salidasHoy) {
    var gasto = Transportes.totalValor(salidasHoy);
    return '<div class="tarjeta">' +
      '<div class="tarjeta-cabecera"><h2>Movimientos de hoy</h2>' +
        '<div class="derecha">' +
          (salidasHoy.length ? '<span class="etiqueta et-baja">' + U.esc(Transportes.moneda(gasto)) + ' en transporte</span>' : '') +
          '<button class="btn btn-mini" data-nueva-salida>+ Registrar tramo</button>' +
          '<button class="btn btn-mini" data-ir="transportes">Ver control</button>' +
        '</div></div>' +
      (salidasHoy.length
        ? '<div class="tabla-envoltura"><table><thead><tr>' +
            '<th>Salida</th><th>Entrada</th><th>Tiempo fuera</th><th>Recorrido</th><th>Detalle</th><th>Valor</th></tr></thead><tbody>' +
          Transportes.ordenar(salidasHoy).map(function (t) {
            var m = Transportes.minutos(t);
            return '<tr>' +
              '<td class="principal-celda">' + U.esc(t.horaSalida || '—') + '</td>' +
              '<td>' + (t.horaEntrada ? U.esc(t.horaEntrada)
                : (t.horaSalida
                    ? '<button class="btn btn-mini" data-cerrar-salida="' + t.id + '">Registrar regreso</button>'
                    : '—')) + '</td>' +
              '<td>' + (m !== null ? U.duracion(m) : '<span class="etiqueta et-abierta">Fuera</span>') + '</td>' +
              '<td>' + U.esc(t.origen || '—') + '<span class="secundario">→ ' + U.esc(t.destino || '—') + '</span></td>' +
              '<td><div class="recorte">' + U.esc(Transportes.detalle(t)) + '</div></td>' +
              '<td>' + U.esc(Transportes.moneda(t.valor)) + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="vacio"><strong>Sin movimientos hoy</strong>Cuando salgas, regístralo aquí.</div>') +
    '</div>';
  }

  function conectar(cont) {
    cont.querySelectorAll('[data-ir]').forEach(function (b) {
      b.onclick = function () { App.ir(b.dataset.ir); };
    });
    cont.querySelectorAll('[data-cerrar-salida]').forEach(function (b) {
      b.onclick = function () { Transportes.cerrarSalida(b.dataset.cerrarSalida); };
    });
    cont.querySelectorAll('[data-nueva-salida]').forEach(function (b) {
      b.onclick = function () { Transportes.formulario(); };
    });
    cont.querySelectorAll('[data-avanzar]').forEach(function (b) {
      b.onclick = function () {
        var s = Almacen.buscarPorId('solicitudes', b.dataset.avanzar);
        var nuevo = s.estado === 'en_proceso' ? 'resuelta' : 'en_proceso';
        Almacen.actualizar('solicitudes', s.id, { estado: nuevo });
        U.aviso('Solicitud marcada como ' + U.ETIQUETAS[nuevo].toLowerCase(), 'ok');
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-marcar]').forEach(function (c) {
      c.onchange = function () {
        Almacen.actualizar('tareas', c.dataset.marcar, { estado: 'hecha', completado: new Date().toISOString() });
        U.aviso('Tarea completada', 'ok');
        App.recargar();
      };
    });
  }

  return { render: render };
})();

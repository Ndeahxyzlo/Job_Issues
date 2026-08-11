var Transportes = (function () {

  var filtros = { periodo: 'mes', desde: '', hasta: '', texto: '' };
  var VALOR_POR_DEFECTO = 3400;

  function todos() { return Almacen.lista('transportes'); }

  function detalle(t) { return t.detalle || t.motivo || ''; }

  function abiertas() {
    return todos().filter(function (t) { return t.horaSalida && !t.horaEntrada; });
  }

  function ordenar(arr) {
    return arr.slice().sort(function (a, b) {
      var ka = (a.fecha || '') + ' ' + (a.horaSalida || '');
      var kb = (b.fecha || '') + ' ' + (b.horaSalida || '');
      if (ka !== kb) return ka < kb ? 1 : -1;
      return (b.creado || '') < (a.creado || '') ? -1 : 1;
    });
  }

  function rangoActual() {
    if (filtros.periodo === 'personalizado') {
      return { desde: filtros.desde, hasta: filtros.hasta };
    }
    return U.rangoPeriodo(filtros.periodo);
  }

  function filtrar() {
    var r = rangoActual();
    return ordenar(todos().filter(function (t) {
      if (r.desde && (t.fecha || '') < r.desde) return false;
      if (r.hasta && (t.fecha || '') > r.hasta) return false;
      if (filtros.texto && !U.contiene([t.origen, t.destino, detalle(t), t.notas].join(' '), filtros.texto)) return false;
      return true;
    }));
  }

  function minutos(t) {
    return U.minutosEntre(t.horaSalida, t.horaEntrada);
  }

  function totalMinutos(registros) {
    return registros.reduce(function (s, t) { return s + (minutos(t) || 0); }, 0);
  }

  function totalValor(registros) {
    return registros.reduce(function (s, t) { return s + (Number(t.valor) || 0); }, 0);
  }

  function moneda(n) {
    return '$' + (Number(n) || 0).toLocaleString('es-CO');
  }

  function valorSugerido() {
    var ultimo = todos().filter(function (t) { return Number(t.valor) > 0; })[0];
    return ultimo ? Number(ultimo.valor) : VALOR_POR_DEFECTO;
  }

  function lugares() {
    var vistos = {};
    todos().forEach(function (t) {
      if (t.origen) vistos[t.origen] = true;
      if (t.destino) vistos[t.destino] = true;
    });
    return Object.keys(vistos).sort();
  }

  function datalistLugares(id) {
    return '<datalist id="' + id + '">' + lugares().map(function (l) {
      return '<option value="' + U.esc(l) + '"></option>';
    }).join('') + '</datalist>';
  }

  function render(cont) {
    var registros = filtrar();
    var r = rangoActual();
    var sinCerrar = abiertas();

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Transportes</h1><p>Cada desplazamiento, con su valor de pasaje.</p></div>' +
        '<div class="derecha">' +
          '<button class="btn" id="imprimir">🖶 Imprimir</button>' +
          '<button class="btn" id="exportar-detalle">⤓ Excel detallado</button>' +
          '<button class="btn btn-primario" id="exportar-relacion">⤓ Relación de gastos</button>' +
          '<button class="btn btn-primario" id="nueva">+ Registrar tramo</button>' +
        '</div>' +
      '</div>' +
      (sinCerrar.length ? avisoSinCerrar(sinCerrar) : '') +
      '<div class="rejilla rejilla-4 no-imprimir" style="margin-bottom:18px">' +
        metrica(registros.length, 'Tramos en el periodo', etiquetaPeriodo(r)) +
        metrica(moneda(totalValor(registros)), 'Gasto de transporte', 'Total a reportar', 'acento-ok') +
        metrica(U.duracion(totalMinutos(registros)) || '0m', 'Tiempo fuera', 'Solo tramos con hora de regreso') +
        metrica(sinCerrar.length, 'Sin registrar regreso', sinCerrar.length ? 'Requiere atención' : 'Todo cerrado',
                sinCerrar.length ? 'acento-alta' : 'acento-ok') +
      '</div>' +
      barraFiltros() +
      '<div class="tarjeta"><div class="tabla-envoltura">' + tabla(registros) + '</div></div>';

    cont.querySelector('#nueva').onclick = function () { formulario(); };
    cont.querySelector('#exportar-relacion').onclick = function () { exportarRelacion(registros, r); };
    cont.querySelector('#exportar-detalle').onclick = function () { exportar(registros, r); };
    cont.querySelector('#imprimir').onclick = function () { window.print(); };
    conectarFiltros(cont);
    conectarFilas(cont);
  }

  function metrica(valor, etiqueta, pie, clase) {
    return '<div class="metrica ' + (clase || '') + '">' +
      '<div class="etiqueta">' + U.esc(etiqueta) + '</div>' +
      '<div class="valor">' + U.esc(valor) + '</div>' +
      (pie ? '<div class="pie">' + U.esc(pie) + '</div>' : '') +
    '</div>';
  }

  function etiquetaPeriodo(r) {
    if (!r.desde && !r.hasta) return 'Todo el historial';
    return U.fechaCorta(r.desde) + ' al ' + U.fechaCorta(r.hasta);
  }

  function avisoSinCerrar(sinCerrar) {
    var t = sinCerrar[0];
    return '<div class="aviso-linea">' +
      '<span>⚠</span>' +
      '<div>Tienes <strong>' + sinCerrar.length + '</strong> tramo' + (sinCerrar.length > 1 ? 's' : '') +
      ' sin hora de regreso. El más reciente: ' + U.esc(t.destino || 'sin destino') +
      ' del ' + U.fechaCorta(t.fecha) + ' a las ' + U.esc(t.horaSalida) + '.</div>' +
      '<button class="btn btn-mini" data-cerrar-salida="' + t.id + '">Registrar regreso</button>' +
    '</div>';
  }

  function barraFiltros() {
    var personalizado = filtros.periodo === 'personalizado';
    return '<div class="filtros">' +
      '<label>Periodo</label>' +
      '<select id="f-periodo">' +
        op('semana', 'Esta semana', filtros.periodo) +
        op('mes', 'Este mes', filtros.periodo) +
        op('todo', 'Todo', filtros.periodo) +
        op('personalizado', 'Personalizado', filtros.periodo) +
      '</select>' +
      (personalizado
        ? '<input type="date" id="f-desde" value="' + U.esc(filtros.desde) + '">' +
          '<span>a</span>' +
          '<input type="date" id="f-hasta" value="' + U.esc(filtros.hasta) + '">'
        : '') +
      '<input type="search" id="f-texto" placeholder="Filtrar por lugar o detalle…" value="' + U.esc(filtros.texto) + '">' +
    '</div>';
  }

  function op(valor, texto, actual) {
    return '<option value="' + U.esc(valor) + '"' + (actual === valor ? ' selected' : '') + '>' + U.esc(texto) + '</option>';
  }

  function conectarFiltros(cont) {
    cont.querySelector('#f-periodo').onchange = function () {
      filtros.periodo = this.value;
      if (this.value === 'personalizado' && !filtros.desde) {
        var r = U.rangoPeriodo('mes');
        filtros.desde = r.desde; filtros.hasta = r.hasta;
      }
      App.recargar();
    };
    var d = cont.querySelector('#f-desde'), h = cont.querySelector('#f-hasta');
    if (d) d.onchange = function () { filtros.desde = this.value; App.recargar(); };
    if (h) h.onchange = function () { filtros.hasta = this.value; App.recargar(); };
    var texto = cont.querySelector('#f-texto');
    texto.oninput = U.retardo(function () {
      filtros.texto = texto.value;
      App.recargar();
      var nuevo = document.querySelector('#f-texto');
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length); }
    }, 300);
  }

  function tabla(registros) {
    if (!registros.length) {
      return '<div class="vacio"><strong>No hay tramos en este periodo</strong>' +
             'Registra uno con «+ Registrar tramo»; la fecha y la hora se llenan solas.</div>';
    }
    return '<table><thead><tr>' +
      '<th>Fecha</th><th>Horario</th><th>Recorrido</th><th>Detalle</th><th>Valor</th><th></th>' +
      '</tr></thead><tbody>' + registros.map(fila).join('') + '</tbody></table>';
  }

  function fila(t) {
    var m = minutos(t);
    var horario = t.horaSalida
      ? U.esc(t.horaSalida) + ' → ' + (t.horaEntrada
          ? U.esc(t.horaEntrada) + '<span class="secundario">' + U.duracion(m) + ' fuera</span>'
          : '<button class="btn btn-mini" data-cerrar-salida="' + t.id + '">Regreso</button>')
      : '<span class="secundario">—</span>';

    return '<tr>' +
      '<td>' + U.fechaCorta(t.fecha) + '</td>' +
      '<td>' + horario + '</td>' +
      '<td><div class="principal-celda">' + U.esc(t.origen || '—') + '</div>' +
        '<span class="secundario">→ ' + U.esc(t.destino || '—') + '</span></td>' +
      '<td><div class="recorte">' + U.esc(detalle(t)) + '</div>' +
        (t.notas ? '<span class="secundario">' + U.esc(U.recortar(t.notas, 60)) + '</span>' : '') + '</td>' +
      '<td class="principal-celda">' + U.esc(moneda(t.valor)) + '</td>' +
      '<td class="acciones">' +
        '<button class="btn btn-mini" data-regreso="' + t.id + '" title="Crear el tramo inverso">↩ Vuelta</button>' +
        '<button class="btn btn-mini" data-editar="' + t.id + '">Editar</button>' +
        '<button class="btn btn-mini btn-peligro" data-eliminar="' + t.id + '">✕</button>' +
      '</td>' +
    '</tr>';
  }

  function conectarFilas(cont) {
    cont.querySelectorAll('[data-cerrar-salida]').forEach(function (b) {
      b.onclick = function () { cerrarSalida(b.dataset.cerrarSalida); };
    });
    cont.querySelectorAll('[data-regreso]').forEach(function (b) {
      b.onclick = function () { tramoDeVuelta(b.dataset.regreso); };
    });
    cont.querySelectorAll('[data-editar]').forEach(function (b) {
      b.onclick = function () { formulario(Almacen.buscarPorId('transportes', b.dataset.editar)); };
    });
    cont.querySelectorAll('[data-eliminar]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Eliminar este tramo?')) return;
        Almacen.eliminar('transportes', b.dataset.eliminar);
        U.aviso('Registro eliminado');
        App.recargar();
      };
    });
  }

  function cerrarSalida(id) {
    var t = Almacen.buscarPorId('transportes', id);
    if (!t) return;
    App.modal({
      titulo: 'Registrar regreso',
      cuerpo:
        '<p style="margin-top:0;color:#6b7787">Salida del <strong>' + U.fechaCorta(t.fecha) +
        '</strong> a las <strong>' + U.esc(t.horaSalida) + '</strong> hacia <strong>' + U.esc(t.destino || '—') + '</strong>.</p>' +
        App.campo({ etiqueta: 'Hora de entrada', nombre: 'horaEntrada', tipo: 'time', valor: U.horaActual(), requerido: true }) +
        App.campo({ etiqueta: 'Notas (opcional)', nombre: 'notas', tipo: 'textarea', valor: t.notas }),
      alGuardar: function (v) {
        if (!v.horaEntrada) { U.aviso('Indica la hora de entrada', 'error'); return false; }
        Almacen.actualizar('transportes', t.id, v);
        U.aviso('Regreso registrado — ' + U.duracion(U.minutosEntre(t.horaSalida, v.horaEntrada)) + ' fuera', 'ok');
        App.recargar();
      }
    });
  }

  function tramoDeVuelta(id) {
    var t = Almacen.buscarPorId('transportes', id);
    if (!t) return;
    formulario(null, {
      fecha: t.fecha,
      origen: t.destino,
      destino: t.origen,
      valor: t.valor
    });
  }

  function formulario(registro, previos) {
    registro = registro || null;
    previos = previos || {};

    function v(campoNombre, alterno) {
      if (registro) return registro[campoNombre];
      if (previos[campoNombre] !== undefined) return previos[campoNombre];
      return alterno;
    }

    App.modal({
      titulo: registro ? 'Editar tramo' : 'Registrar tramo',
      cuerpo:
        datalistLugares('lista-lugares') +
        '<div class="fila">' +
          App.campo({ etiqueta: 'Fecha', nombre: 'fecha', tipo: 'date', valor: v('fecha', U.hoyISO()), requerido: true }) +
          App.campo({ etiqueta: 'Hora de salida', nombre: 'horaSalida', tipo: 'time', valor: v('horaSalida', U.horaActual()) }) +
          App.campo({ etiqueta: 'Hora de entrada', nombre: 'horaEntrada', tipo: 'time', valor: v('horaEntrada', ''),
                      ayuda: 'Déjala vacía si aún no regresas.' }) +
        '</div>' +
        App.campo({ etiqueta: 'Origen', nombre: 'origen', valor: v('origen', ''), requerido: true,
                    atributos: 'list="lista-lugares" placeholder="¿De dónde sales?"',
                    ayuda: 'Los lugares que ya usaste aparecen al escribir.' }) +
        App.campo({ etiqueta: 'Destino', nombre: 'destino', valor: v('destino', ''), requerido: true,
                    atributos: 'list="lista-lugares" placeholder="¿A dónde vas?"' }) +
        App.campo({ etiqueta: 'Detalle', nombre: 'detalle', tipo: 'textarea', valor: registro ? detalle(registro) : '',
                    atributos: 'placeholder="Qué se hizo en esa visita"' }) +
        App.campo({ etiqueta: 'Valor del transporte', nombre: 'valor', tipo: 'number',
                    valor: v('valor', valorSugerido()), atributos: 'min="0" step="50"' }) +
        App.campo({ etiqueta: 'Notas internas (no salen en la relación)', nombre: 'notas', tipo: 'textarea', valor: registro && registro.notas }),
      alGuardar: function (val) {
        if (!val.fecha || !val.origen.trim() || !val.destino.trim()) {
          U.aviso('Fecha, origen y destino son obligatorios', 'error');
          return false;
        }
        val.valor = Number(val.valor) || 0;
        if (registro) Almacen.actualizar('transportes', registro.id, val);
        else Almacen.agregar('transportes', val);
        U.aviso('Tramo guardado', 'ok');
        App.recargar();
      }
    });
  }

  function exportarRelacion(registros, rango) {
    registros = registros || filtrar();
    rango = rango || rangoActual();
    if (!registros.length) { U.aviso('No hay tramos para exportar', 'error'); return; }

    var orden = registros.slice().reverse();

    XLSX.descargar('Relacion gastos transporte ' + nombreRango(rango) + '.xlsx', [{
      nombre: 'Hoja1',
      plano: true,
      columnas: ['Columna 1', 'Origen ', 'Destino ', 'Detalle ', 'valor'],
      anchos: [13.71, 38.01, 38.01, 43.01, 15.41],
      filas: orden.map(function (t) {
        return [XLSX.fecha(t.fecha), t.origen || '', t.destino || '', detalle(t), Number(t.valor) || 0];
      })
    }]);
    U.aviso('Relación de gastos generada — ' + moneda(totalValor(registros)), 'ok');
  }

  function nombreRango(rango) {
    if (!rango.desde) return 'historial';
    return rango.desde + ' a ' + rango.hasta;
  }

  function exportar(registros, rango) {
    registros = registros || filtrar();
    rango = rango || rangoActual();
    if (!registros.length) { U.aviso('No hay registros para exportar', 'error'); return; }

    var cerradas = registros.filter(function (t) { return t.horaEntrada; });
    var total = totalMinutos(registros);
    var gasto = totalValor(registros);
    var orden = registros.slice().reverse();

    var hojaDetalle = {
      nombre: 'Tramos',
      titulo: 'Control de transportes — ' + etiquetaPeriodo(rango),
      columnas: ['Fecha', 'Hora salida', 'Hora entrada', 'Tiempo fuera', 'Minutos', 'Origen', 'Destino', 'Detalle', 'Valor', 'Notas'],
      anchos: [12, 12, 13, 13, 10, 30, 30, 42, 12, 28],
      filas: orden.map(function (t) {
        var m = minutos(t);
        return [
          XLSX.fecha(t.fecha), t.horaSalida || '', t.horaEntrada || (t.horaSalida ? 'Sin registrar' : ''),
          m !== null ? U.duracion(m) : '', m !== null ? m : '',
          t.origen || '', t.destino || '', detalle(t), Number(t.valor) || 0, t.notas || ''
        ];
      }),
      totales: [
        ['Total de tramos', registros.length],
        ['Con hora de regreso', cerradas.length],
        ['Tiempo fuera total', U.duracion(total), total],
        ['Gasto de transporte', gasto]
      ]
    };

    var porDia = {};
    orden.forEach(function (t) {
      var k = t.fecha || 'sin fecha';
      if (!porDia[k]) porDia[k] = { tramos: 0, minutos: 0, valor: 0, lugares: [] };
      porDia[k].tramos++;
      porDia[k].minutos += minutos(t) || 0;
      porDia[k].valor += Number(t.valor) || 0;
      if (t.destino) porDia[k].lugares.push(t.destino);
    });

    var hojaResumen = {
      nombre: 'Resumen por día',
      titulo: 'Resumen diario — ' + etiquetaPeriodo(rango),
      columnas: ['Fecha', 'Tramos', 'Tiempo fuera', 'Minutos', 'Gasto', 'Destinos'],
      anchos: [14, 10, 14, 10, 12, 60],
      filas: Object.keys(porDia).sort().map(function (k) {
        var d = porDia[k];
        return [XLSX.fecha(k), d.tramos, U.duracion(d.minutos), d.minutos, d.valor, d.lugares.join(', ')];
      }),
      totales: [['Total', registros.length, U.duracion(total), total, gasto]]
    };

    XLSX.descargar('Transportes detalle ' + nombreRango(rango) + '.xlsx', [hojaDetalle, hojaResumen]);
    U.aviso('Excel generado', 'ok');
  }

  return {
    render: render, formulario: formulario, todos: todos, abiertas: abiertas,
    cerrarSalida: cerrarSalida, tramoDeVuelta: tramoDeVuelta,
    exportar: exportar, exportarRelacion: exportarRelacion,
    minutos: minutos, ordenar: ordenar, detalle: detalle, moneda: moneda,
    totalValor: totalValor
  };
})();

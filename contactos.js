var Contactos = (function () {

  function todos() {
    return Almacen.lista('contactos').slice().sort(function (a, b) {
      return U.normalizar(a.nombre) < U.normalizar(b.nombre) ? -1 : 1;
    });
  }

  function nombre(id) {
    var c = Almacen.buscarPorId('contactos', id);
    return c ? c.nombre : '';
  }

  function asegurar(nombreTexto, area) {
    nombreTexto = (nombreTexto || '').trim();
    if (!nombreTexto) return '';
    var existente = todos().filter(function (c) {
      return U.normalizar(c.nombre) === U.normalizar(nombreTexto);
    })[0];
    if (existente) return existente.id;
    var nuevo = Almacen.agregar('contactos', {
      nombre: nombreTexto, area: area || '', telefono: '', notas: ''
    });
    return nuevo.id;
  }

  function datalistHTML(id) {
    return '<datalist id="' + id + '">' + todos().map(function (c) {
      return '<option value="' + U.esc(c.nombre) + '">' + U.esc(c.area || '') + '</option>';
    }).join('') + '</datalist>';
  }

  function contadorActividad(idContacto) {
    var s = Almacen.lista('solicitudes').filter(function (r) { return r.contactoId === idContacto; });
    var t = Almacen.lista('tareas').filter(function (r) { return r.contactoId === idContacto; });
    return {
      solicitudes: s.length,
      abiertas: s.filter(function (r) { return r.estado !== 'resuelta'; }).length,
      tareas: t.length
    };
  }

  function render(cont) {
    var registros = todos();

    cont.innerHTML =
      '<div class="vista-cabecera">' +
        '<div><h1>Directorio</h1><p>Personas y áreas que te hacen solicitudes.</p></div>' +
        '<div class="derecha">' +
          '<button class="btn btn-primario" id="nuevo-contacto">+ Nuevo contacto</button>' +
        '</div>' +
      '</div>' +
      '<div class="tarjeta"><div class="tabla-envoltura">' + tabla(registros) + '</div></div>';

    cont.querySelector('#nuevo-contacto').onclick = function () { formulario(); };

    cont.querySelectorAll('[data-editar]').forEach(function (b) {
      b.onclick = function () { formulario(Almacen.buscarPorId('contactos', b.dataset.editar)); };
    });
    cont.querySelectorAll('[data-eliminar]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Eliminar este contacto del directorio? Las solicitudes y tareas no se borran.')) return;
        Almacen.eliminar('contactos', b.dataset.eliminar);
        U.aviso('Contacto eliminado');
        App.recargar();
      };
    });
    cont.querySelectorAll('[data-ver]').forEach(function (b) {
      b.onclick = function () { Buscador.ejecutar(b.dataset.ver); };
    });
  }

  function tabla(registros) {
    if (!registros.length) {
      return '<div class="vacio"><strong>Directorio vacío</strong>' +
             'Los contactos se agregan solos cuando registras una solicitud con un nombre nuevo.</div>';
    }
    return '<table><thead><tr>' +
      '<th>Nombre</th><th>Área</th><th>Teléfono</th><th>Actividad</th><th>Notas</th><th></th>' +
      '</tr></thead><tbody>' +
      registros.map(function (c) {
        var a = contadorActividad(c.id);
        return '<tr>' +
          '<td class="principal-celda">' + U.esc(c.nombre) + '</td>' +
          '<td>' + U.esc(c.area || '—') + '</td>' +
          '<td>' + U.esc(c.telefono || '—') + '</td>' +
          '<td>' + a.solicitudes + ' solicitudes' +
            (a.abiertas ? '<span class="secundario">' + a.abiertas + ' sin resolver</span>' : '') + '</td>' +
          '<td><div class="recorte">' + U.esc(c.notas || '') + '</div></td>' +
          '<td class="acciones">' +
            '<button class="btn btn-mini" data-ver="' + U.esc(c.nombre) + '">Ver todo</button>' +
            '<button class="btn btn-mini" data-editar="' + c.id + '">Editar</button>' +
            '<button class="btn btn-mini btn-peligro" data-eliminar="' + c.id + '">Eliminar</button>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function formulario(registro) {
    registro = registro || null;
    App.modal({
      titulo: registro ? 'Editar contacto' : 'Nuevo contacto',
      cuerpo:
        '<div class="fila">' +
          App.campo({ etiqueta: 'Nombre', nombre: 'nombre', valor: registro && registro.nombre, requerido: true }) +
          App.campo({ etiqueta: 'Área o empresa', nombre: 'area', valor: registro && registro.area }) +
        '</div>' +
        App.campo({ etiqueta: 'Teléfono / WhatsApp', nombre: 'telefono', valor: registro && registro.telefono }) +
        App.campo({ etiqueta: 'Notas', nombre: 'notas', tipo: 'textarea', valor: registro && registro.notas }),
      alGuardar: function (v) {
        if (!v.nombre.trim()) { U.aviso('El nombre es obligatorio', 'error'); return false; }
        if (registro) Almacen.actualizar('contactos', registro.id, v);
        else Almacen.agregar('contactos', v);
        U.aviso('Contacto guardado', 'ok');
        App.recargar();
      }
    });
  }

  return {
    render: render, todos: todos, nombre: nombre, asegurar: asegurar,
    datalistHTML: datalistHTML, formulario: formulario
  };
})();

var App = (function () {

  var vistaActual = 'inicio';
  var contenedor;
  var alGuardarActual = null;

  var VISTAS = {
    inicio: Inicio,
    solicitudes: Solicitudes,
    tareas: Tareas,
    transportes: Transportes,
    contactos: Contactos,
    respaldo: Respaldo,
    resultados: Buscador
  };

  function ir(vista) {
    if (!VISTAS[vista]) vista = 'inicio';
    if (vista !== 'resultados') {
      var caja = document.getElementById('busqueda-global');
      if (caja && caja.value) { caja.value = ''; Buscador.fijarTermino(''); }
    }
    vistaActual = vista;
    recargar();
  }

  function recargar() {
    VISTAS[vistaActual].render(contenedor);
    contenedor.scrollTop = 0;
    marcarMenu();
    actualizarInsignias();
  }

  function marcarMenu() {
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('activo', b.dataset.vista === vistaActual);
    });
  }

  function actualizarInsignias() {
    poner('badge-solicitudes', Solicitudes.abiertas().length);
    poner('badge-tareas', Tareas.abiertas().length);
    poner('badge-transportes', Transportes.abiertas().length);
  }

  function poner(id, n) {
    var el = document.getElementById(id);
    if (el) el.textContent = n > 0 ? n : '';
  }

  var modal, modalForm, modalTitulo, modalCuerpo;

  function abrirModal(opciones) {
    modalTitulo.textContent = opciones.titulo || '';
    modalCuerpo.innerHTML = opciones.cuerpo || '';
    alGuardarActual = opciones.alGuardar || null;
    modal.showModal();
    var primero = modalCuerpo.querySelector('input:not([type=hidden]), textarea, select');
    if (primero) primero.focus();
  }

  function cerrarModal() {
    alGuardarActual = null;
    modal.close();
  }

  function valoresFormulario() {
    var v = {};
    modalCuerpo.querySelectorAll('[name]').forEach(function (el) {
      v[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return v;
  }

  function campo(o) {
    var tipo = o.tipo || 'text';
    var valor = o.valor === undefined || o.valor === null ? '' : o.valor;
    var req = o.requerido ? ' required' : '';
    var extra = o.atributos ? ' ' + o.atributos : '';
    var control;

    if (tipo === 'textarea') {
      control = '<textarea name="' + o.nombre + '"' + req + extra + '>' + U.esc(valor) + '</textarea>';
    } else if (tipo === 'select') {
      control = '<select name="' + o.nombre + '"' + req + extra + '>' +
        (o.opciones || []).map(function (op) {
          return '<option value="' + U.esc(op.valor) + '"' +
                 (String(op.valor) === String(valor) ? ' selected' : '') + '>' + U.esc(op.texto) + '</option>';
        }).join('') + '</select>';
    } else {
      control = '<input type="' + tipo + '" name="' + o.nombre + '" value="' + U.esc(valor) + '"' + req + extra + '>';
    }

    return '<div class="campo">' +
      '<label>' + U.esc(o.etiqueta) + '</label>' +
      control +
      (o.ayuda ? '<small>' + U.esc(o.ayuda) + '</small>' : '') +
    '</div>';
  }

  function iniciar() {
    contenedor = document.getElementById('vista');
    modal = document.getElementById('modal');
    modalForm = document.getElementById('modal-form');
    modalTitulo = document.getElementById('modal-titulo');
    modalCuerpo = document.getElementById('modal-cuerpo');

    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.onclick = function () { ir(b.dataset.vista); };
    });

    document.getElementById('btn-nueva-solicitud').onclick = function () { Solicitudes.formulario(); };
    document.getElementById('btn-nueva-tarea').onclick = function () { Tareas.formulario(); };
    document.getElementById('btn-nueva-salida').onclick = function () { Transportes.formulario(); };

    document.querySelectorAll('[data-cerrar-modal]').forEach(function (b) {
      b.onclick = cerrarModal;
    });

    modalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!alGuardarActual) { cerrarModal(); return; }
      var resultado = alGuardarActual(valoresFormulario());
      if (resultado !== false) cerrarModal();
    });

    var busqueda = document.getElementById('busqueda-global');
    busqueda.addEventListener('input', U.retardo(function () {
      var t = busqueda.value.trim();
      Buscador.fijarTermino(t);
      if (t.length >= 2) {
        if (vistaActual !== 'resultados') ir('resultados');
        else recargar();
      } else if (vistaActual === 'resultados' && t.length === 0) {
        ir('inicio');
      }
    }, 320));

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        busqueda.focus();
        busqueda.select();
      }
    });

    reloj();
    setInterval(reloj, 30000);

    ir('inicio');
  }

  function reloj() {
    var el = document.getElementById('reloj');
    if (el) el.textContent = U.fechaLarga(U.hoyISO()) + ' · ' + U.horaActual();
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  return { ir: ir, recargar: recargar, modal: abrirModal, cerrarModal: cerrarModal, campo: campo };
})();

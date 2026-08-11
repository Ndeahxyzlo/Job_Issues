var U = (function () {

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  function horaActual() {
    var d = new Date();
    return dos(d.getHours()) + ':' + dos(d.getMinutes());
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  function fechaCorta(iso) {
    if (!iso) return '';
    var p = iso.slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function fechaHora(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes());
  }

  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function fechaLarga(iso) {
    var p = (iso || hoyISO()).split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function minutosEntre(inicio, fin) {
    if (!inicio || !fin) return null;
    var a = inicio.split(':'), b = fin.split(':');
    var m1 = (+a[0]) * 60 + (+a[1]);
    var m2 = (+b[0]) * 60 + (+b[1]);
    var dif = m2 - m1;
    if (dif < 0) dif += 24 * 60;
    return dif;
  }

  function duracion(min) {
    if (min === null || min === undefined || isNaN(min)) return '';
    var h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  function diasHasta(iso) {
    if (!iso) return null;
    var p = iso.split('-');
    var objetivo = new Date(+p[0], +p[1] - 1, +p[2]);
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((objetivo - hoy) / 86400000);
  }

  function textoVencimiento(iso) {
    var d = diasHasta(iso);
    if (d === null) return '';
    if (d < 0) return 'Venció hace ' + Math.abs(d) + (Math.abs(d) === 1 ? ' día' : ' días');
    if (d === 0) return 'Vence hoy';
    if (d === 1) return 'Vence mañana';
    return 'En ' + d + ' días';
  }

  function rangoPeriodo(tipo) {
    var hoy = new Date();
    var desde, hasta;
    if (tipo === 'semana') {
      var dia = hoy.getDay() === 0 ? 7 : hoy.getDay();
      desde = new Date(hoy); desde.setDate(hoy.getDate() - dia + 1);
      hasta = new Date(desde); hasta.setDate(desde.getDate() + 6);
    } else if (tipo === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else {
      return { desde: '', hasta: '' };
    }
    return { desde: aISO(desde), hasta: aISO(hasta) };
  }

  function aISO(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function contiene(texto, termino) {
    return normalizar(texto).indexOf(normalizar(termino)) !== -1;
  }

  function recortar(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  var ETIQUETAS = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    hecha: 'Hecha',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
  };

  function etiqueta(valor) {
    return '<span class="etiqueta et-' + esc(valor) + '">' + esc(ETIQUETAS[valor] || valor) + '</span>';
  }

  function aviso(mensaje, tipo) {
    var cont = document.getElementById('avisos');
    var el = document.createElement('div');
    el.className = 'aviso' + (tipo ? ' ' + tipo : '');
    el.textContent = mensaje;
    cont.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function descargar(nombre, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function retardo(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
    };
  }

  return {
    uid: uid, hoyISO: hoyISO, horaActual: horaActual, dos: dos,
    fechaCorta: fechaCorta, fechaHora: fechaHora, fechaLarga: fechaLarga,
    minutosEntre: minutosEntre, duracion: duracion, diasHasta: diasHasta,
    textoVencimiento: textoVencimiento, rangoPeriodo: rangoPeriodo, aISO: aISO,
    esc: esc, normalizar: normalizar, contiene: contiene, recortar: recortar,
    etiqueta: etiqueta, ETIQUETAS: ETIQUETAS,
    aviso: aviso, descargar: descargar, retardo: retardo
  };
})();

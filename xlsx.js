var XLSX = (function () {

  var TABLA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function texto(s) { return new TextEncoder().encode(s); }

  function fechaDOS(d) {
    var hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    var fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { hora: hora & 0xFFFF, fecha: fecha & 0xFFFF };
  }

  function crearZip(archivos) {
    var ahora = fechaDOS(new Date());
    var partes = [];
    var central = [];
    var offset = 0;

    archivos.forEach(function (a) {
      var nombre = texto(a.nombre);
      var datos = texto(a.contenido);
      var crc = crc32(datos);

      var cabecera = new Uint8Array(30 + nombre.length);
      var v = new DataView(cabecera.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x0800, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, ahora.hora, true);
      v.setUint16(12, ahora.fecha, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, datos.length, true);
      v.setUint32(22, datos.length, true);
      v.setUint16(26, nombre.length, true);
      v.setUint16(28, 0, true);
      cabecera.set(nombre, 30);

      partes.push(cabecera, datos);

      var cd = new Uint8Array(46 + nombre.length);
      var vc = new DataView(cd.buffer);
      vc.setUint32(0, 0x02014b50, true);
      vc.setUint16(4, 20, true);
      vc.setUint16(6, 20, true);
      vc.setUint16(8, 0x0800, true);
      vc.setUint16(10, 0, true);
      vc.setUint16(12, ahora.hora, true);
      vc.setUint16(14, ahora.fecha, true);
      vc.setUint32(16, crc, true);
      vc.setUint32(20, datos.length, true);
      vc.setUint32(24, datos.length, true);
      vc.setUint16(28, nombre.length, true);
      vc.setUint16(30, 0, true);
      vc.setUint16(32, 0, true);
      vc.setUint16(34, 0, true);
      vc.setUint16(36, 0, true);
      vc.setUint32(38, 0, true);
      vc.setUint32(42, offset, true);
      cd.set(nombre, 46);
      central.push(cd);

      offset += cabecera.length + datos.length;
    });

    var tamCentral = central.reduce(function (s, c) { return s + c.length; }, 0);
    var fin = new Uint8Array(22);
    var vf = new DataView(fin.buffer);
    vf.setUint32(0, 0x06054b50, true);
    vf.setUint16(8, archivos.length, true);
    vf.setUint16(10, archivos.length, true);
    vf.setUint32(12, tamCentral, true);
    vf.setUint32(16, offset, true);

    return new Blob(partes.concat(central, [fin]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function escXml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  function letraColumna(n) {
    var s = '';
    while (n > 0) {
      var r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function esNumero(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function fecha(iso) {
    return (iso ? { __fecha: iso } : '');
  }

  function esFecha(v) {
    return v && typeof v === 'object' && v.__fecha;
  }

  function serialFecha(iso) {
    var p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return null;
    var ms = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    return Math.round((ms - Date.UTC(1899, 11, 30)) / 86400000);
  }

  function celda(ref, valor, estilo, estiloFecha) {
    if (esFecha(valor)) {
      var serial = serialFecha(valor.__fecha);
      if (serial === null) return '';
      return '<c r="' + ref + '" s="' + estiloFecha + '"><v>' + serial + '</v></c>';
    }
    var est = estilo ? ' s="' + estilo + '"' : '';
    if (valor === null || valor === undefined || valor === '') {
      return estilo ? '<c r="' + ref + '"' + est + '/>' : '';
    }
    if (esNumero(valor)) {
      return '<c r="' + ref + '"' + est + '><v>' + valor + '</v></c>';
    }
    return '<c r="' + ref + '"' + est + ' t="inlineStr"><is><t xml:space="preserve">' +
           escXml(valor) + '</t></is></c>';
  }

  function hojaXml(hoja) {
    var plano = !!hoja.plano;
    var estEncabezado = plano ? 0 : 1;
    var estDato = plano ? 0 : 2;
    var estFecha = plano ? 6 : 5;

    var cols = '';
    if (hoja.anchos && hoja.anchos.length) {
      cols = '<cols>' + hoja.anchos.map(function (a, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + a + '" customWidth="1"/>';
      }).join('') + '</cols>';
    }

    var filas = [];
    var n = 1;

    if (hoja.titulo && !plano) {
      filas.push('<row r="1">' + celda('A1', hoja.titulo, 3) + '</row>');
      filas.push('<row r="2"/>');
      n = 3;
    }

    var filaEncabezado = n;
    filas.push('<row r="' + n + '">' + hoja.columnas.map(function (c, i) {
      return celda(letraColumna(i + 1) + n, c, estEncabezado, estFecha);
    }).join('') + '</row>');
    n++;

    (hoja.filas || []).forEach(function (fila) {
      var celdas = fila.map(function (v, i) {
        return celda(letraColumna(i + 1) + n, v, estDato, estFecha);
      }).join('');
      filas.push('<row r="' + n + '">' + celdas + '</row>');
      n++;
    });

    if (hoja.totales && hoja.totales.length) {
      filas.push('<row r="' + n + '"/>');
      n++;
      hoja.totales.forEach(function (fila) {
        var celdas = fila.map(function (v, i) {
          return celda(letraColumna(i + 1) + n, v, 4, estFecha);
        }).join('');
        filas.push('<row r="' + n + '">' + celdas + '</row>');
        n++;
      });
    }

    var ultima = letraColumna(hoja.columnas.length) + (n - 1);
    var extras = '';
    if (!plano) {
      extras = '<autoFilter ref="A' + filaEncabezado + ':' + letraColumna(hoja.columnas.length) +
               Math.max(filaEncabezado, filaEncabezado + (hoja.filas || []).length) + '"/>';
    }

    var vista = plano
      ? '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
      : '<sheetViews><sheetView workbookViewId="0">' +
        '<pane ySplit="' + filaEncabezado + '" topLeftCell="A' + (filaEncabezado + 1) +
        '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + ultima + '"/>' +
      vista +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      '<sheetData>' + filas.join('') + '</sheetData>' +
      extras +
      '</worksheet>';
  }

  var ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>' +
    '<fonts count="4">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="14"/><color rgb="FF1D4ED8"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FFD9DEE7"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="7">' +
      '<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
      '<xf xfId="0" numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf xfId="0" numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>' +
      '<xf xfId="0" numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>' +
      '<xf xfId="0" numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf xfId="0" numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  function nombreHojaSeguro(n, i) {
    var s = String(n || ('Hoja' + (i + 1))).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31);
    return escXml(s);
  }

  function generar(hojas) {
    var archivos = [];

    archivos.push({
      nombre: '[Content_Types].xml',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        hojas.map(function (h, i) {
          return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }).join('') +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>'
    });

    archivos.push({
      nombre: '_rels/.rels',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    });

    archivos.push({
      nombre: 'xl/workbook.xml',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        hojas.map(function (h, i) {
          return '<sheet name="' + nombreHojaSeguro(h.nombre, i) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
        }).join('') +
        '</sheets></workbook>'
    });

    archivos.push({
      nombre: 'xl/_rels/workbook.xml.rels',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hojas.map(function (h, i) {
          return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
        }).join('') +
        '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>'
    });

    archivos.push({ nombre: 'xl/styles.xml', contenido: ESTILOS });

    hojas.forEach(function (h, i) {
      archivos.push({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', contenido: hojaXml(h) });
    });

    return crearZip(archivos);
  }

  function descargar(nombreArchivo, hojas) {
    U.descargar(nombreArchivo, generar(hojas));
  }

  return { generar: generar, descargar: descargar, fecha: fecha, serialFecha: serialFecha };
})();

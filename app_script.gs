/**
 * Código para Google Apps Script (Código.gs)
 * Este script lee las hojas del Google Sheet, calcula los KPIs y devuelve un JSON
 * para que tu Dashboard lo consuma. Además, incluye análisis con Gemini AI.
 */

var EXTRA_USERS_KEY_GS = 'rb_extra_users_gs';
var CONTENIDO_SHEET_NAME = 'Contenido de Capacitación';

var INITIAL_TRAINING_CONTENT = [
  // Enero - Febrero 2026
  ['CONT-001', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 RA', 'Unidad 1-Acoso sexual y laboral', '', '.mp4', 'https://cdn.jwplayer.com/previews/80hnYQa8'],
  ['CONT-002', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 RA', 'Unidad 2-Seguridad de la información', '', 'Scorm', 'https://cloud.scorm.com/ScormEngineInterface/defaultui/player/modern.html?configuration=jxafvt-cenxtWsmJHYvgJsRhqS9xMPrSXEV4Lm3To3qFIfQYge_ZHcEOZbKfQx1ZucJksxbgGNCmbTie0pJnB1NvIp5PwAkFD4zhMA8wMGjocunDNG0AVH2JIlZdn49QMUxGJBMqp137xjDPMNGCF8HDzPsg193KbA1fBeg2VodQwscfjXaWV-gQQv9qtbfvJJa3nKAtmNulPYVDWd7dWjtZaKXVnKDIOfPP0e5b&preventRightClick=true&cc=es&cache=22.38.484.6401bc3&playerConfUrl=j&package=A9p8VauflS8FkmAQT_F_K___YcyySzHBwyE9i11_lsnxslQ1DoBlgoPhPTGq7TqF99vOa2dMKwP6FFHtOSfbDA-DeVv09MrljBc_6xacYW6SruCVcm_rppE1U9UwHdzN4nZ4Et_CY9Ts98lMBz7UKlbMeOqUIqg&redirectUrl=https%3A%2F%2Fcloud.scorm.com%2FEngineWebServices%2FCloser.html&tracking=false&forceReview=false'],
  ['CONT-003', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 RA', 'Unidad 3-Temas de impacto', '', '.mp4', 'https://cdn.jwplayer.com/previews/GXaPsBZQ'],
  ['CONT-004', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 RA', 'Unidad 4-Cambios', '', '.pdf', 'https://s3.boostworld.com/lms/0096/28/334c0236ab3e3b1a69431479bb8f2cb45f72e07e.pdf'],
  ['CONT-005', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 RA', 'Unidad 5-Protocolo de seguridad', '', '.mp4', 'https://cdn.jwplayer.com/previews/tYCvbkqw'],
  ['CONT-006', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 1-Acoso sexual y laboral', '', '.mp4', 'https://cdn.jwplayer.com/previews/80hnYQa8'],
  ['CONT-007', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 2-Seguridad de la información', '', 'Scorm', 'https://cloud.scorm.com/ScormEngineInterface/defaultui/player/modern.html?configuration=jxafvt-cenxtWsmJHYvgJsRhqS9xMPrSXEV4Lm3To3qFIfQYge_ZHcEOZbKfQx1ZucJksxbgGNCmbTie0pJnB1NvIp5PwAkFD4zhMA8wMGjocunDNG0AVH2JIlZdn49QMUxGJBMqp137xjDPMNGCF8HDzPsg193KbA1fBeg2VodQwscfjXaWV-gQQv9qtbfvJJa3nKAtmNulPYVDWd7dWjtZaKXVnKDIOfPP0e5b&preventRightClick=true&cc=es&cache=22.38.484.6401bc3&playerConfUrl=j&package=A9p8VauflS8FkmAQT_F_K___YcyySzHBwyE9i11_lsnxslQ1DoBlgoPhPTGq7TqF99vOa2dMKwP6FFHtOSfbDA-DeVv09MrljBc_6xacYW6SruCVcm_rppE1U9UwHdzN4nZ4Et_CY9Ts98lMBz7UKlbMeOqUIqg&redirectUrl=https%3A%2F%2Fcloud.scorm.com%2FEngineWebServices%2FCloser.html&tracking=false&forceReview=false'],
  ['CONT-008', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 3-Temas de impacto', '', '.mp4', 'https://cdn.jwplayer.com/previews/GXaPsBZQ'],
  ['CONT-009', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 4-Cambios', '', '.pdf', 'https://s3.boostworld.com/lms/0096/28/334c0236ab3e3b1a69431479bb8f2cb45f72e07e.pdf'],
  ['CONT-010', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 5-Top 3 personalización', '', '.mp4', 'https://cdn.jwplayer.com/previews/c467OpLo'],
  ['CONT-011', 'Enero - Febrero 2026', 'Capacitación bimensual Enero-Febrero 2026', 'Capacitación bimensual enero - febrero 2026 SO RAP', 'Unidad 6-Protocolo de seguridad', '', '.mp4', 'https://cdn.jwplayer.com/previews/tYCvbkqw'],
  // Marzo - Abril 2026
  ['CONT-012', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 1-CAMBIOS TRANSMIPASS', '', '.pdf', 'https://s3.boostworld.com/lms/0103/35/2ea6f64b6017cb838388be919db3d8ad1c6ca54b.pdf'],
  ['CONT-013', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 2-KIT ANTIDISTURBIOS', '', '.mp4', 'https://cdn.jwplayer.com/previews/bEBg7Y0B'],
  ['CONT-014', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 3-PROTOCOLO DE LLAVES', '', '.mp4', 'https://cdn.jwplayer.com/previews/DQT11hNT'],
  ['CONT-015', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 1', '.mp4', 'https://cdn.jwplayer.com/previews/E1ftph3K'],
  ['CONT-016', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 2', '.mp4', 'https://cdn.jwplayer.com/previews/BmPyGlcX'],
  ['CONT-017', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 3', '.mp4', 'https://cdn.jwplayer.com/previews/Pp4ocXhE'],
  ['CONT-018', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 4', '.mp4', 'https://cdn.jwplayer.com/previews/UWRi0iA7'],
  ['CONT-019', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 5', '.mp4', 'https://cdn.jwplayer.com/previews/80hnYQa8'],
  ['CONT-020', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RA', 'Unidad 4-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 6', '.mp4', 'https://cdn.jwplayer.com/previews/3eRqBSxO'],
  ['CONT-021', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 1-KIT ANTIDISTURBIOS', '', '.mp4', 'https://cdn.jwplayer.com/previews/bEBg7Y0B'],
  ['CONT-022', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 2-ACTUALIZACIÓN DE DATOS DE ADULTO MAYOR', '', '.mp4', 'https://cdn.jwplayer.com/previews/PdyubA4z'],
  ['CONT-023', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 3-DILIGENCIAMIENTO DEL FORMATO DE ACTUALIZACIÓN DE DATOS', '', '.mp4', 'https://cdn.jwplayer.com/previews/Eec0r4mb'],
  ['CONT-024', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 4-MANTENIMIENTO DE IMPRESORA', 'Capítulo 1', '.mp4', 'https://cdn.jwplayer.com/previews/H6uCu9Yi'],
  ['CONT-025', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 4-MANTENIMIENTO DE IMPRESORA', 'Capítulo 2', '.pdf', 'https://s3.boostworld.com/lms/0102/37/c948f4f664ba23b4053466e3724b069bfd012ab1.pdf'],
  ['CONT-026', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 1', '.mp4', 'https://cdn.jwplayer.com/previews/E1ftph3K'],
  ['CONT-027', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 2', '.mp4', 'https://cdn.jwplayer.com/previews/BmPyGlcX'],
  ['CONT-028', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 3', '.mp4', 'https://cdn.jwplayer.com/previews/Pp4ocXhE'],
  ['CONT-029', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 4', '.mp4', 'https://cdn.jwplayer.com/previews/UWRi0iA7'],
  ['CONT-030', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 5', '.mp4', 'https://cdn.jwplayer.com/previews/80hnYQa8'],
  ['CONT-031', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - RAP', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 6', '.mp4', 'https://cdn.jwplayer.com/previews/3eRqBSxO'],
  ['CONT-032', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 1-CAMBIOS TRANSMIPASS', '', '.pdf', 'https://s3.boostworld.com/lms/0103/35/2ea6f64b6017cb838388be919db3d8ad1c6ca54b.pdf'],
  ['CONT-033', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 2-KIT ANTIDISTURBIOS', '', '.mp4', 'https://cdn.jwplayer.com/previews/bEBg7Y0B'],
  ['CONT-034', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 3-PROTOCOLO DE LLAVES', '', '.mp4', 'https://cdn.jwplayer.com/previews/DQT11hNT'],
  ['CONT-035', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 4-PROTOCOLO DE LLAVES', '', '.mp4', 'https://cdn.jwplayer.com/previews/937P32Nt'],
  ['CONT-036', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 1', '.mp4', 'https://cdn.jwplayer.com/previews/E1ftph3K'],
  ['CONT-037', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 2', '.mp4', 'https://cdn.jwplayer.com/previews/BmPyGlcX'],
  ['CONT-038', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 3', '.mp4', 'https://cdn.jwplayer.com/previews/Pp4ocXhE'],
  ['CONT-039', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 4', '.mp4', 'https://cdn.jwplayer.com/previews/UWRi0iA7'],
  ['CONT-040', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 5', '.mp4', 'https://cdn.jwplayer.com/previews/80hnYQa8'],
  ['CONT-041', 'Marzo - Abril 2026', 'Capacitación bimensual Marzo-Abril 2026', 'Capacitación Bimensual Marzo -Abril 2026 - SO', 'Unidad 5-PREVENCIÓN DE ACOSO LABORAL Y SEXUAL 2025', 'Capítulo 6', '.mp4', 'https://cdn.jwplayer.com/previews/3eRqBSxO'],
  // Mayo 2026
  ['CONT-042', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RA', 'Unidad 1-Actualización de Procesos', 'Capítulo 1-Políticas y Funciones', '.mp4', 'https://cdn.jwplayer.com/previews/FOqOnCNP'],
  ['CONT-043', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RA', 'Unidad 1-Actualización de Procesos', 'Capítulo 2-Protocolo de Apertura', '.mp4', 'https://cdn.jwplayer.com/previews/wASBYLIe'],
  ['CONT-044', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RA', 'Unidad 1-Actualización de Procesos', 'Capítulo 3-Manejo de bases', '.mp4', 'https://cdn.jwplayer.com/previews/6HCaGByK'],
  ['CONT-045', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RA', 'Unidad 1-Actualización de Procesos', 'Capítulo 4-Encuesta de Caracterización vial', '.pdf', 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf'],
  ['CONT-046', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RAP', 'Unidad 1-Diligenciamiento del formato de actualización de datos', '', '.mp4', 'https://cdn.jwplayer.com/previews/Eec0r4mb'],
  ['CONT-047', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RAP', 'Unidad 2-Top 3', '', '.mp4', 'https://cdn.jwplayer.com/previews/AdKELORk'],
  ['CONT-048', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-RAP', 'Unidad 3-Encuesta de Caracterización vial', '', '.pdf', 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf'],
  ['CONT-049', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 1-Políticas y Funciones', 'Capítulo 1-Políticas y Funciones RA', '.mp4', 'https://cdn.jwplayer.com/previews/FOqOnCNP'],
  ['CONT-050', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 1-Políticas y Funciones', 'Capítulo 2-Políticas y Funciones SO', '.mp4', 'https://cdn.jwplayer.com/previews/rpV4HHWE'],
  ['CONT-051', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 2-Protocolo de Apertura', 'Capítulo 1-Protocolo de Apertura RA', '.mp4', 'https://cdn.jwplayer.com/previews/wASBYLIe'],
  ['CONT-052', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 2-Protocolo de Apertura', 'Capítulo 2-Protocolo de Apertura SO', '.mp4', 'https://cdn.jwplayer.com/previews/sUcXn6wy'],
  ['CONT-053', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 3-Manejo de Bases', 'Capítulo 1-Manejo de Bases RA', '.mp4', 'https://cdn.jwplayer.com/previews/6HCaGByK'],
  ['CONT-054', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 3-Manejo de Bases', 'Capítulo 2-Manejo de Bases SO', '.mp4', 'https://cdn.jwplayer.com/previews/Ofyd3oin'],
  ['CONT-055', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 4-TOP 3 PERSONALIZACIÓN', '', '.mp4', 'https://cdn.jwplayer.com/previews/AdKELORk'],
  ['CONT-056', 'Mayo 2026', 'Capacitación bimensual Mayo 2026', 'Capacitación Bimensual Mayo 2026-SO', 'Unidad 5-Encuesta de Caracterización Vial', '', '.pdf', 'https://s3.boostworld.com/lms/0115/45/2cc3ff98ba055c1821fa416961517d00b9aafdc2.pdf'],
  // Junio 2026
  ['CONT-057', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RA', 'Unidad 1-Procesos de Venta y Recarga en estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/Sput2IHC'],
  ['CONT-058', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RA', 'Unidad 2-Administración de Efectivo en estaciones', '', '.pdf', 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf'],
  ['CONT-059', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RA', 'Unidad 3-Cierre de Operación en Estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/jYi4jkvx'],
  ['CONT-060', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RA', 'Unidad 4-Cambio de Tirilla', '', '.mp4', 'https://cdn.jwplayer.com/previews/pVpuFvuU'],
  ['CONT-061', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RA', 'Unidad 5-ABC Experiencia en vía', '', '.mp4', 'https://cdn.jwplayer.com/previews/2gAPgn17'],
  ['CONT-062', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 1-Procesos de Venta y Recarga en estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/Sput2IHC'],
  ['CONT-063', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 2-Administración de Efectivo en estaciones', '', '.pdf', 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf'],
  ['CONT-064', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 3-Cierre de Operación en Estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/jYi4jkvx'],
  ['CONT-065', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 4-Cambio de Tirilla', '', '.mp4', 'https://cdn.jwplayer.com/previews/pVpuFvuU'],
  ['CONT-066', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 5-ABC Experiencia en vía', '', '.mp4', 'https://cdn.jwplayer.com/previews/2gAPgn17'],
  ['CONT-067', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-RAP', 'Unidad 6-Atención preferencial en fila', '', '.mp4', 'https://cdn.jwplayer.com/previews/0eYHvKGo'],
  ['CONT-068', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 1-Procesos de Venta y Recarga en estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/Sput2IHC'],
  ['CONT-069', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 2-Administración de Efectivo en estaciones', '', '.pdf', 'https://s3.boostworld.com/lms/0126/59/7c21cb0c6c2ab1bb5430e2c3384b0373c4444ba0.pdf'],
  ['CONT-070', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 3-Cierre de Operación en Estaciones', '', '.mp4', 'https://cdn.jwplayer.com/previews/jYi4jkvx'],
  ['CONT-071', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 4-Cambio de Tirilla', '', '.mp4', 'https://cdn.jwplayer.com/previews/pVpuFvuU'],
  ['CONT-072', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 5-ABC Experiencia en vía', '', '.mp4', 'https://cdn.jwplayer.com/previews/2gAPgn17'],
  ['CONT-073', 'Junio 2026', 'Capacitación bimensual junio-julio 2026', 'Capacitación Bimensual Junio 2026-SO', 'Unidad 6-Atención preferencial en fila', '', '.mp4', 'https://cdn.jwplayer.com/previews/0eYHvKGo']
];

/**
 * Crea y puebla automáticamente la hoja "Contenido de Capacitación" si no existe o está vacía.
 * Puede ejecutarse manualmente desde el editor de Apps Script.
 */
function inicializarHojaContenido() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return ensureContenidoSheet(spreadsheet);
}

function ensureContenidoSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(CONTENIDO_SHEET_NAME);
  var headers = ['ID', 'Mes', 'Programa', 'Capacitación', 'Unidad', 'Capítulo', 'Formato', 'URL', 'Fecha Registro', 'Registrado Por'];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONTENIDO_SHEET_NAME);
  }
  if (sheet.getLastRow() <= 1) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#001e47')
      .setFontColor('#CDD400')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    var nowStr = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm');
    var rows = INITIAL_TRAINING_CONTENT.map(function(item) {
      return [item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], nowStr, 'Sistema Inicial'];
    });
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }
  return readContenidoSheet(sheet);
}

function readContenidoSheet(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var list = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[2] && !row[3] && !row[7]) continue;
    list.push({
      id: row[0] ? row[0].toString().trim() : ('CONT-' + r),
      mes: row[1] ? row[1].toString().trim() : '',
      programa: row[2] ? row[2].toString().trim() : '',
      capacitacion: row[3] ? row[3].toString().trim() : '',
      unidad: row[4] ? row[4].toString().trim() : '',
      capitulo: row[5] ? row[5].toString().trim() : '',
      formato: row[6] ? row[6].toString().trim() : 'Link',
      url: row[7] ? row[7].toString().trim() : '',
      fecha_registro: row[8] ? row[8].toString().trim() : '',
      autor: row[9] ? row[9].toString().trim() : ''
    });
  }
  return list;
}

/** Devuelve la lista de usuarios extra guardados en Properties */
function getExtraUsersFromProps() {
  var raw = PropertiesService.getScriptProperties().getProperty(EXTRA_USERS_KEY_GS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

/** Guarda la lista de usuarios extra en Properties */
function saveExtraUsersToProps(users) {
  PropertiesService.getScriptProperties().setProperty(EXTRA_USERS_KEY_GS, JSON.stringify(users));
}

var USABILIDAD_LOGS_KEY_GS = 'rb_usabilidad_logs_gs';
var USABILIDAD_SHEET_NAME = 'Registro de Usabilidad';

function getUsabilidadLogsFromProps() {
  var raw = PropertiesService.getScriptProperties().getProperty(USABILIDAD_LOGS_KEY_GS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

function saveUsabilidadLogsToProps(logs) {
  var trimmed = logs.slice(0, 1000);
  PropertiesService.getScriptProperties().setProperty(USABILIDAD_LOGS_KEY_GS, JSON.stringify(trimmed));
}

function ensureUsabilidadSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(USABILIDAD_SHEET_NAME);
  var headers = ['ID', 'Fecha/Hora', 'Usuario', 'Rol', 'Categoría', 'Acción', 'Detalle', 'Origen'];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(USABILIDAD_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#001e47')
      .setFontColor('#CDD400')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendUsabilidadLog(spreadsheet, entry) {
  var logs = getUsabilidadLogsFromProps();
  var nowIso = entry.timestamp || new Date().toISOString();
  var fechaCol = entry.fecha_colombia || Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');
  var logObj = {
    id: entry.id || ('LOG-' + new Date().getTime() + '-' + Math.floor(Math.random() * 900 + 100)),
    timestamp: nowIso,
    fecha_colombia: fechaCol,
    usuario: (entry.usuario || 'Invitado').toString(),
    rol: (entry.rol || 'Invitado').toString(),
    categoria: (entry.categoria || 'CONSULTA').toString(),
    accion: (entry.accion || '').toString(),
    detalle: (entry.detalle || '').toString(),
    origen: (entry.origen || '').toString()
  };
  logs.unshift(logObj);
  saveUsabilidadLogsToProps(logs);

  try {
    var sheet = ensureUsabilidadSheet(spreadsheet);
    sheet.appendRow([logObj.id, logObj.fecha_colombia, logObj.usuario, logObj.rol, logObj.categoria, logObj.accion, logObj.detalle, logObj.origen]);
  } catch (e) {}

  return logs;
}

function doGet(e) {
  return handleResponse();
}

/**
 * doPost: Gestiona usuarios extra y contenido de capacitaciones en la hoja "Contenido de Capacitación".
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var users = getExtraUsersFromProps();
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'add_user') {
      var newUser = body.user;
      var alreadyExists = users.some(function(u) { return u.password === newUser.password; });
      if (alreadyExists) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Esa contraseña ya existe.' })).setMimeType(ContentService.MimeType.JSON);
      }
      users.push(newUser);
      saveExtraUsersToProps(users);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, users: users })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'remove_user') {
      var pwToRemove = body.password;
      users = users.filter(function(u) { return u.password !== pwToRemove; });
      saveExtraUsersToProps(users);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, users: users })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'init_content_sheet') {
      var contenido = ensureContenidoSheet(spreadsheet);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, contenido: contenido })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'add_content' || action === 'bulk_add_content') {
      ensureContenidoSheet(spreadsheet);
      var sheet = spreadsheet.getSheetByName(CONTENIDO_SHEET_NAME);
      var items = Array.isArray(body.items) ? body.items : (body.item ? [body.item] : []);
      if (items.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'No se recibieron ítems de contenido.' })).setMimeType(ContentService.MimeType.JSON);
      }
      var nowStr = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm');
      var baseIdx = sheet.getLastRow();
      var rowsToAdd = items.map(function(it, idx) {
        var id = it.id || ('CONT-' + String(baseIdx + idx).padStart(3, '0') + '-' + Math.floor(Math.random() * 900 + 100));
        return [
          id,
          (it.mes || '').toString().trim(),
          (it.programa || '').toString().trim(),
          (it.capacitacion || '').toString().trim(),
          (it.unidad || '').toString().trim(),
          (it.capitulo || '').toString().trim(),
          (it.formato || 'Link').toString().trim(),
          (it.url || '').toString().trim(),
          nowStr,
          (it.autor || body.autor || 'Super Administrador').toString().trim()
        ];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 10).setValues(rowsToAdd);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, contenido: readContenidoSheet(sheet) })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'delete_content') {
      var sheetDel = spreadsheet.getSheetByName(CONTENIDO_SHEET_NAME);
      if (!sheetDel) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'La hoja de contenido no existe.' })).setMimeType(ContentService.MimeType.JSON);
      }
      var targetId = (body.id || '').toString().trim();
      var dataDel = sheetDel.getDataRange().getValues();
      for (var dr = dataDel.length - 1; dr >= 1; dr--) {
        if (dataDel[dr][0] && dataDel[dr][0].toString().trim() === targetId) {
          sheetDel.deleteRow(dr + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, contenido: readContenidoSheet(sheetDel) })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'log_activity') {
      var updatedLogs = appendUsabilidadLog(spreadsheet, body.entry || {});
      return ContentService.createTextOutput(JSON.stringify({ ok: true, logs: updatedLogs })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'clear_logs') {
      saveUsabilidadLogsToProps([]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, logs: [] })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Acción desconocida.' })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleResponse() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  
  var allCoursesData = {};
  var allAreasData = {};
  var allFeedbacks = [];
  var totalAttendees = 0;
  var globalFinished = 0;
  var globalApproved = 0;
  var globalStarted = 0;
  var globalRatingsCount = 0;
  var globalRatingsSum = 0;
  // Contadores por género
  var genderStats = {
    Masculino: { count: 0, sum: 0, enrolled: 0 },
    Femenino:  { count: 0, sum: 0, enrolled: 0 }
  };

  // Diccionario para consolidar trazabilidad por colaborador (Cédula o Nombre)
  var colaboradoresMap = {};
  var hasHistoricoSheet = spreadsheet.getSheetByName("Histórico") !== null || spreadsheet.getSheetByName("Historico") !== null;

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName().trim();
    var sheetLower = sheetName.toLowerCase();
    if (sheetLower === "histórico" || sheetLower === "historico" || sheetLower === "datos de capacitación" || sheetLower === "datos de capacitacion" || sheetLower === "analisis de valoración" || sheetLower === "contenido de capacitación" || sheetLower === "contenido de capacitacion" || sheetLower === "registro de usabilidad") {
      continue;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;
    
    var headers = data[0];
    var colIndex = {};
    for (var h = 0; h < headers.length; h++) {
       if(headers[h]) colIndex[headers[h].toString().trim()] = h;
    }
    
    if (colIndex['Curso'] === undefined) continue;

    var participantColName = Object.keys(colIndex).find(function(k) { return k.match(/nombre|colaborador|participante|alumno|empleado/i); });
    var cedulaColName = Object.keys(colIndex).find(function(k) { return k.match(/cédula|cedula|identificación|documento|id/i); });
    var areaColName = Object.keys(colIndex).find(function(k) { return k.toLowerCase() === 'área' || k.toLowerCase() === 'area'; });
    var generoColName = Object.keys(colIndex).find(function(k) { return k.toLowerCase() === 'género' || k.toLowerCase() === 'genero' || k.toLowerCase() === 'sexo' || k.toLowerCase() === 'género'; });

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var cursoName = row[colIndex['Curso']];
      if (!cursoName) continue;
      
      var areaName = areaColName ? row[colIndex[areaColName]].toString().trim() : sheet.getName();
      if (!areaName) areaName = "Sin Área";

      if (!allAreasData[areaName]) {
        allAreasData[areaName] = {
          name: areaName,
          total_enrolled: 0,
          not_started: 0,
          approved: 0,
          finished: 0,
          participants: []
        };
      }

      var estadoColaborador = colIndex['Estado'] !== undefined ? row[colIndex['Estado']] : "Activo";
      var estadoAprobacion = colIndex['Estado de Aprobación'] !== undefined ? row[colIndex['Estado de Aprobación']].toString().trim() : "";
      var participantName = participantColName ? row[colIndex[participantColName]] : ("Participante " + r);
      var cedulaVal = cedulaColName ? row[colIndex[cedulaColName]].toString().trim() : "";
      if (!cedulaVal) cedulaVal = participantName;
      
      // Contar inscritos por género (todos los registros, hayan valorado o no)
      var generoRowRaw = generoColName ? row[colIndex[generoColName]].toString().trim().toLowerCase() : "";
      if (generoRowRaw.indexOf('f') !== -1 || generoRowRaw === 'mujer' || generoRowRaw === 'femenino') {
        genderStats.Femenino.enrolled++;
      } else if (generoRowRaw.indexOf('m') !== -1 || generoRowRaw === 'hombre' || generoRowRaw === 'masculino') {
        genderStats.Masculino.enrolled++;
      }
      
      if (!allCoursesData[cursoName]) {
         allCoursesData[cursoName] = {
            name: cursoName, category: areaName, total_enrolled: 0, not_started: 0, approved: 0, finished: 0, ratings_count: 0, ratings_sum: 0, activos: 0, inactivos: 0
         };
      }
      
      var c = allCoursesData[cursoName];
      var a = allAreasData[areaName];
      
      c.total_enrolled++;
      a.total_enrolled++;
      totalAttendees++;

      if (estadoColaborador === "Activo") { c.activos++; } else { c.inactivos++; }

      var lowerEstado = estadoAprobacion.toLowerCase();
      var isParticipated = false;
      var isApproved = false;

      if (lowerEstado.indexOf("inscrit") !== -1 || lowerEstado === "") {
        c.not_started++;
        a.not_started++;
      } else {
        isParticipated = true;
        if (lowerEstado === "aprobado" || lowerEstado === "aprobados") {
          c.approved++; a.approved++;
          c.finished++; a.finished++;
          isApproved = true;
        } else if (lowerEstado === "no aprobado" || lowerEstado === "no aprobados" || lowerEstado.indexOf("reproba") !== -1 || lowerEstado.indexOf("finaliz") !== -1) {
          c.finished++; a.finished++;
        }
      }

      a.participants.push({
         name: participantName,
         course: cursoName,
         status: estadoAprobacion,
         cedula: cedulaVal
      });

      // Solo consolidar colaboradores desde las hojas individuales SI NO EXISTE la hoja Histórico
      if (!hasHistoricoSheet) {
        var colabKeyFallback = cedulaVal.replace(/\.0$/, '').replace(/[\s\.\,-]/g, '');
        if (!colabKeyFallback) colabKeyFallback = participantName.toLowerCase();
        if (!colaboradoresMap[colabKeyFallback]) {
          colaboradoresMap[colabKeyFallback] = {
            cedula: cedulaVal,
            nombre: participantName,
            area: areaName,
            asignados: 0,
            participados: 0,
            aprobados: 0
          };
        }
        var colabObj = colaboradoresMap[colabKeyFallback];
        colabObj.asignados++;
        if (isParticipated) colabObj.participados++;
        if (isApproved) colabObj.aprobados++;
      }

      var valoracion = colIndex['Valoración'] !== undefined ? row[colIndex['Valoración']] : "";
      if (valoracion !== "" && valoracion != null && !isNaN(valoracion)) {
         var valFloat = parseFloat(valoracion);
         c.ratings_count++;
         c.ratings_sum += valFloat;
         globalRatingsCount++;
         globalRatingsSum += valFloat;

         // Acumular por género
         var generoRaw = generoColName ? row[colIndex[generoColName]].toString().trim().toLowerCase() : "";
         if (generoRaw.indexOf('f') !== -1 || generoRaw === 'mujer' || generoRaw === 'femenino') {
           genderStats.Femenino.count++;
           genderStats.Femenino.sum += valFloat;
         } else if (generoRaw.indexOf('m') !== -1 || generoRaw === 'hombre' || generoRaw === 'masculino') {
           genderStats.Masculino.count++;
           genderStats.Masculino.sum += valFloat;
         }
         
         var comentario = colIndex['Comentario'] !== undefined ? row[colIndex['Comentario']] : "";
         if (comentario && comentario.toString().length > 3) {
            allFeedbacks.push("Área " + areaName + " | Curso: " + cursoName + " | Valoración: " + valoracion + " | Comentario: " + comentario);
         }
      }
    }
  }

  // --- Leer Hoja "Histórico" ---
  var historicoCursos = [];
  var historicoSheet = spreadsheet.getSheetByName("Histórico") || spreadsheet.getSheetByName("Historico");
  if (historicoSheet) {
    var hData = historicoSheet.getDataRange().getValues();
    if (hData.length > 1) {
      var hHeaders = hData[0];
      var hColIndex = {};
      for (var hh = 0; hh < hHeaders.length; hh++) {
        if (hHeaders[hh]) hColIndex[hHeaders[hh].toString().trim().toLowerCase()] = hh;
      }
      
      // Función auxiliar para obtener el índice ENTERO de la columna
      function findColIndexInt(keywords, defaultIdx) {
        for (var k in hColIndex) {
          for (var kw = 0; kw < keywords.length; kw++) {
            if (k === keywords[kw] || k.indexOf(keywords[kw]) !== -1) {
              return hColIndex[k];
            }
          }
        }
        return defaultIdx;
      }

      var mesColIdx = findColIndexInt(['nombre capacitación', 'nombre capacita', 'mes', 'periodo', 'período'], 0); // Col A (0)
      var cursoColIdx = findColIndexInt(['curso'], 1); // Col B (1)
      var idColIdx = findColIndexInt(['identificador', 'identificación', 'identificacion', 'cédula', 'cedula', 'documento', 'cc', 'id'], 2); // Col C (2)
      
      // Buscar estrictamente la columna Nombre del Colaborador (Columna D, índice 3) e ignorar Nombre Capacitación (Columna A)
      var nomColIdx = -1;
      for (var kNom in hColIndex) {
        var cleanNomK = kNom.trim().toLowerCase();
        if (cleanNomK === 'nombre' || cleanNomK === 'nombre colaborador' || cleanNomK === 'nombre del colaborador' || cleanNomK === 'colaborador' || cleanNomK === 'participante') {
          nomColIdx = hColIndex[kNom];
          break;
        }
      }
      if (nomColIdx === -1) nomColIdx = 3; // Columna D (índice 3, base 0) por defecto

      var emailColIdx = findColIndexInt(['email', 'correo'], 4); // Col E (4)
      var avanceColIdx = findColIndexInt(['porcentaje de avance', 'avance'], 5); // Col F (5)
      var estAprColIdx = findColIndexInt(['estado de aprobación', 'estado de aprobacion', 'aprobación', 'aprobacion'], 6); // Col G (6)
      var notaColIdx = findColIndexInt(['nota', 'calificación', 'calificacion', 'puntaje'], 7); // Col H (7)
      var estColabColIdx = -1;
      for (var kEst in hColIndex) {
        if (kEst.trim().toLowerCase() === 'estado') { estColabColIdx = hColIndex[kEst]; break; }
      }
      if (estColabColIdx === -1) estColabColIdx = 8; // Col I (8)
      var instanciaColIdx = findColIndexInt(['nombre de la instancia', 'instancia'], 9); // Col J (9)
      var primerIngresoColIdx = findColIndexInt(['fecha primer ingreso', 'primer ingreso'], 10); // Col K (10)
      var completadoColIdx = findColIndexInt(['fecha completado', 'completado'], 11); // Col L (11)
      
      // Buscar estrictamente la columna Valoración (Columna M, índice 12) e ignorar Nota / Porcentaje (Columna H/F)
      var valColIdx = -1;
      for (var kVal in hColIndex) {
        var cleanValK = kVal.trim().toLowerCase();
        if (cleanValK === 'valoración' || cleanValK === 'valoracion' || cleanValK === 'satisfacción' || cleanValK === 'satisfaccion') {
          valColIdx = hColIndex[kVal];
          break;
        }
      }
      if (valColIdx === -1) valColIdx = 12; // Columna M (índice 12, base 0) por defecto
      var comentarioColIdx = findColIndexInt(['comentario', 'observacion', 'observación'], 13); // Col N (13)
      var ccColIdx = findColIndexInt(['centro de costos', 'centro de costo'], 14); // Col O (14)
      
      // Buscar strictly la columna Área (Columna P, índice 15, base 0) e ignorar Centro de Costo (Columna O)
      var areaColIdx = -1;
      for (var kHeader in hColIndex) {
        var cleanK = kHeader.trim().toLowerCase();
        if (cleanK === 'área' || cleanK === 'area') {
          areaColIdx = hColIndex[kHeader];
          break;
        }
      }
      if (areaColIdx === -1) areaColIdx = 15; // Columna P (índice 15, base 0) como fallback por defecto
      var generoHColIdx = findColIndexInt(['genero', 'género', 'sexo'], 16); // Col Q (16)

      function formatCellDateStr(val) {
        if (!val) return '';
        if (val instanceof Date) {
          return Utilities.formatDate(val, 'GMT-5', 'yyyy-MM-dd');
        }
        return val.toString().trim();
      }

      // Agrupación por capacitación principal (Columna A)
      var historicoGroupMap = {};

      for (var hr = 1; hr < hData.length; hr++) {
        var hRow = hData[hr];
        var mesVal = (mesColIdx >= 0 && hRow[mesColIdx]) ? hRow[mesColIdx].toString().trim() : "";
        if (!mesVal) continue;
        
        var cursoBVal = (cursoColIdx >= 0 && hRow[cursoColIdx] !== undefined) ? hRow[cursoColIdx].toString().trim() : "";
        var estAprRaw = (estAprColIdx >= 0 && hRow[estAprColIdx]) ? hRow[estAprColIdx].toString().trim() : "";
        var estApr = estAprRaw.toLowerCase();
        var valVal = (valColIdx >= 0 && !isNaN(hRow[valColIdx]) && hRow[valColIdx] !== "") ? Number(hRow[valColIdx]) : null;
        var areaVal = (areaColIdx >= 0 && hRow[areaColIdx] !== undefined && hRow[areaColIdx] !== "") ? hRow[areaColIdx].toString().trim() : "Sin Área";

        // Limpiar sufijos como -RA, -RAP, -SO si vinieran pegados en el nombre de la capacitación
        var mainCourseName = mesVal.replace(/-(RA|RAP|SO|ADM|OPER|TECN)$/i, '').trim();

        if (!historicoGroupMap[mainCourseName]) {
          historicoGroupMap[mainCourseName] = {
            mes: mainCourseName,
            curso: mainCourseName,
            publico_objetivo: 0,
            participacion_cant: 0,
            aprobacion_cant: 0,
            ratings_sum: 0,
            ratings_count: 0,
            areasMap: {}
          };
        }
        var g = historicoGroupMap[mainCourseName];
        g.publico_objetivo++;

        if (!g.areasMap[areaVal]) {
          g.areasMap[areaVal] = { area: areaVal, publico_objetivo: 0, participacion_cant: 0, aprobacion_cant: 0 };
        }
        var gArea = g.areasMap[areaVal];
        gArea.publico_objetivo++;

        var isPart = (estApr.indexOf("inscrit") === -1 && estApr !== "");
        var isApr = (estApr === "aprobado" || estApr === "aprobados");

        if (isPart) {
          g.participacion_cant++;
          gArea.participacion_cant++;
        }
        if (isApr) {
          g.aprobacion_cant++;
          gArea.aprobacion_cant++;
        }
        if (valVal !== null && valVal > 0 && valVal <= 5) { // Solo calificaciones válidas entre 1 y 5
          g.ratings_sum += valVal;
          g.ratings_count++;
        }

        // Registrar / acumular trazabilidad por colaborador (Cédula o Nombre)
        var cIdRaw = (idColIdx >= 0 && hRow[idColIdx] !== undefined) ? hRow[idColIdx].toString().trim() : "";
        var cNomRaw = (nomColIdx >= 0 && hRow[nomColIdx] !== undefined) ? hRow[nomColIdx].toString().trim() : "";
        var cEmailRaw = (emailColIdx >= 0 && hRow[emailColIdx] !== undefined) ? hRow[emailColIdx].toString().trim() : "";
        var cAvanceRaw = (avanceColIdx >= 0 && hRow[avanceColIdx] !== undefined && hRow[avanceColIdx] !== "") ? hRow[avanceColIdx].toString().trim() : "0";
        var cNotaRaw = (notaColIdx >= 0 && hRow[notaColIdx] !== undefined && hRow[notaColIdx] !== "") ? hRow[notaColIdx].toString().trim() : "";
        var cEstadoColabRaw = (estColabColIdx >= 0 && hRow[estColabColIdx] !== undefined) ? hRow[estColabColIdx].toString().trim() : "";
        var cInstanciaRaw = (instanciaColIdx >= 0 && hRow[instanciaColIdx] !== undefined) ? hRow[instanciaColIdx].toString().trim() : "";
        var cPrimerIng = formatCellDateStr(primerIngresoColIdx >= 0 ? hRow[primerIngresoColIdx] : "");
        var cCompletado = formatCellDateStr(completadoColIdx >= 0 ? hRow[completadoColIdx] : "");
        var cValoracionStr = (valColIdx >= 0 && hRow[valColIdx] !== undefined && hRow[valColIdx] !== "") ? hRow[valColIdx].toString().trim() : "";
        var cComentarioStr = (comentarioColIdx >= 0 && hRow[comentarioColIdx] !== undefined) ? hRow[comentarioColIdx].toString().trim() : "";
        var cCcStr = (ccColIdx >= 0 && hRow[ccColIdx] !== undefined) ? hRow[ccColIdx].toString().trim() : "";
        var cGeneroStr = (generoHColIdx >= 0 && hRow[generoHColIdx] !== undefined) ? hRow[generoHColIdx].toString().trim() : "";
        
        // Normalizar Cédula (quitar decimales .0 y caracteres especiales)
        var cIdNorm = cIdRaw.replace(/\.0$/, '').replace(/[\s\.\,-]/g, '');
        if (cNomRaw || cIdNorm) {
          var colabKeyH = cIdNorm ? cIdNorm : cNomRaw.toLowerCase();
          if (!colaboradoresMap[colabKeyH]) {
            colaboradoresMap[colabKeyH] = {
              cedula: cIdNorm || cIdRaw || 'N/A',
              nombre: cNomRaw || 'Sin Nombre',
              email: cEmailRaw,
              area: areaVal,
              centro_costos: cCcStr,
              genero: cGeneroStr,
              estado_colab: cEstadoColabRaw,
              asignados: 0,
              participados: 0,
              aprobados: 0,
              historial_cursos: []
            };
          }
          var cObjH = colaboradoresMap[colabKeyH];
          cObjH.asignados++;
          if (cNomRaw && cNomRaw !== 'Sin Nombre') {
            cObjH.nombre = cNomRaw;
          }
          if (cEmailRaw && !cObjH.email) cObjH.email = cEmailRaw;
          if (cCcStr && !cObjH.centro_costos) cObjH.centro_costos = cCcStr;
          if (cGeneroStr && !cObjH.genero) cObjH.genero = cGeneroStr;
          if (cEstadoColabRaw) cObjH.estado_colab = cEstadoColabRaw;
          if (areaVal !== "Sin Área" && (!cObjH.area || cObjH.area === "Sin Área")) {
            cObjH.area = areaVal;
          }
          if (isPart) cObjH.participados++;
          if (isApr) cObjH.aprobados++;

          cObjH.historial_cursos.push({
            programa: mesVal,
            curso: cursoBVal || mesVal,
            avance: cAvanceRaw,
            estado_aprobacion: estAprRaw || 'Inscrito',
            nota: cNotaRaw,
            estado_colab: cEstadoColabRaw,
            instancia: cInstanciaRaw,
            fecha_primer_ingreso: cPrimerIng,
            fecha_completado: cCompletado,
            valoracion: cValoracionStr,
            comentario: cComentarioStr,
            centro_costos: cCcStr,
            area: areaVal
          });
        }
      }

      for (var gk in historicoGroupMap) {
        var gItem = historicoGroupMap[gk];
        var areasList = [];
        for (var aKey in gItem.areasMap) {
          var aObj = gItem.areasMap[aKey];
          areasList.push({
            area: aObj.area,
            publico_objetivo: aObj.publico_objetivo,
            participacion_cant: aObj.participacion_cant,
            participacion_pct: aObj.publico_objetivo > 0 ? (aObj.participacion_cant / aObj.publico_objetivo) * 100 : 0,
            aprobacion_cant: aObj.aprobacion_cant,
            aprobacion_pct: aObj.publico_objetivo > 0 ? (aObj.aprobacion_cant / aObj.publico_objetivo) * 100 : 0
          });
        }
        // Ordenar áreas alfabéticamente
        areasList.sort(function(a,b) { return a.area.localeCompare(b.area); });

        historicoCursos.push({
          mes: gItem.mes,
          curso: gItem.curso,
          publico_objetivo: gItem.publico_objetivo,
          participacion_cant: gItem.participacion_cant,
          participacion_pct: gItem.publico_objetivo > 0 ? (gItem.participacion_cant / gItem.publico_objetivo) * 100 : 0,
          aprobacion_cant: gItem.aprobacion_cant,
          aprobacion_pct: gItem.publico_objetivo > 0 ? (gItem.aprobacion_cant / gItem.publico_objetivo) * 100 : 0,
          promedio_satisfaccion: gItem.ratings_count > 0 ? (gItem.ratings_sum / gItem.ratings_count) : 4.8,
          areas: areasList
        });
      }
    }
  }

  // --- Leer Hoja "Datos de Capacitación" ---
  var datosCapacitacion = {};
  var datosSheet = spreadsheet.getSheetByName("Datos de Capacitación") || spreadsheet.getSheetByName("Datos de Capacitacion");
  if (datosSheet) {
    var dData = datosSheet.getDataRange().getValues();
    if (dData.length > 1) {
      var dHeaders = dData[0];
      var dColIndex = {};
      for (var dh = 0; dh < dHeaders.length; dh++) {
        if (dHeaders[dh]) dColIndex[dHeaders[dh].toString().trim().toLowerCase()] = dh;
      }
      var dNomCapCol = Object.keys(dColIndex).find(function(k) { return k === 'nombre capacitación' || k === 'nombre capacitacion' || k === 'nombre' || k.indexOf('nombre') !== -1; });
      if (!dNomCapCol) dNomCapCol = Object.keys(dColIndex).find(function(k) { return k.indexOf('curso') !== -1; });
      var dInicioCol = Object.keys(dColIndex).find(function(k) { return k.indexOf('inicio') !== -1 || k.indexOf('desde') !== -1; });
      var dFinCol = Object.keys(dColIndex).find(function(k) { return k.indexOf('fin') !== -1 || k.indexOf('hasta') !== -1; });
      
      for (var dr = 1; dr < dData.length; dr++) {
        var dRow = dData[dr];
        var dCursoName = dNomCapCol !== undefined && dRow[dColIndex[dNomCapCol]] ? dRow[dColIndex[dNomCapCol]].toString().trim() : "";
        if (!dCursoName) continue;

        var fInicio = dInicioCol !== undefined && dRow[dColIndex[dInicioCol]] ? dRow[dColIndex[dInicioCol]].toString().trim() : "";
        var fFin = dFinCol !== undefined && dRow[dColIndex[dFinCol]] ? dRow[dColIndex[dFinCol]].toString().trim() : "";
        
        // Extraer imagen de portada de Columna A (índice 0)
        var rawPortada = dRow[0] ? dRow[0].toString().trim() : "";
        var fotoUrlConverted = "";
        if (rawPortada) {
          var matchFileId = rawPortada.match(/\/d\/([^\/\?]+)/) || rawPortada.match(/id=([^&]+)/);
          if (matchFileId && matchFileId[1]) {
            fotoUrlConverted = "https://drive.google.com/thumbnail?id=" + matchFileId[1] + "&sz=w1000";
          } else if (rawPortada.indexOf('http') === 0) {
            fotoUrlConverted = rawPortada;
          }
        }

        datosCapacitacion[dCursoName] = {
          nombre: dCursoName,
          fecha_inicio: fInicio,
          fecha_fin: fFin,
          foto_portada: fotoUrlConverted,
          descripcion: dColIndex['descripción'] !== undefined || dColIndex['descripcion'] !== undefined ? dRow[dColIndex['descripción'] || dColIndex['descripcion']] : "",
          facilitador: dColIndex['facilitador'] !== undefined || dColIndex['instructor'] !== undefined ? dRow[dColIndex['facilitador'] || dColIndex['instructor']] : "",
          duracion: dColIndex['duración'] !== undefined || dColIndex['duracion'] !== undefined ? dRow[dColIndex['duración'] || dColIndex['duracion']] : ""
        };
      }
    }
  }

  // Convertir trazabilidad de colaboradores en arreglo
  var colaboradoresArray = [];
  for (var cKey in colaboradoresMap) {
    var item = colaboradoresMap[cKey];
    item.pct_participacion = item.asignados > 0 ? (item.participados / item.asignados) * 100 : 0;
    item.pct_aprobacion = item.asignados > 0 ? (item.aprobados / item.asignados) * 100 : 0;
    colaboradoresArray.push(item);
  }

  var coursesOutput = [];
  for (var key in allCoursesData) {
     var c = allCoursesData[key];
     var started = c.total_enrolled - c.not_started;
     c.participation = c.total_enrolled > 0 ? (started / c.total_enrolled) * 100 : 0;
     c.approval = c.total_enrolled > 0 ? (c.approved / c.total_enrolled) * 100 : 0;
     c.feedback_participation = c.total_enrolled > 0 ? (c.ratings_count / c.total_enrolled) * 100 : 0;
     c.average_rating = c.ratings_count > 0 ? (c.ratings_sum / c.ratings_count) : 0;
     c.enrolled = c.total_enrolled; 
     
     globalStarted += started;
     globalApproved += c.approved;
     globalFinished += c.finished;
     coursesOutput.push(c);
  }

  var areasOutput = [];
  for (var key in allAreasData) {
     var a = allAreasData[key];
     var aStarted = a.total_enrolled - a.not_started;
     a.participation = a.total_enrolled > 0 ? (aStarted / a.total_enrolled) * 100 : 0;
     a.approval = a.total_enrolled > 0 ? (a.approved / a.total_enrolled) * 100 : 0;
     a.enrolled = a.total_enrolled;
     areasOutput.push(a);
  }

  var globalAvgRating = globalRatingsCount > 0 ? (globalRatingsSum / globalRatingsCount) : 0;
  var globalRatingParticipation = totalAttendees > 0 ? (globalRatingsCount / totalAttendees) * 100 : 0;

  var lastUpdatedStr = "";
  try {
    var file = DriveApp.getFileById(spreadsheet.getId());
    lastUpdatedStr = Utilities.formatDate(file.getLastUpdated(), "GMT-5", "dd/MM/yyyy HH:mm");
  } catch(e) {
    lastUpdatedStr = Utilities.formatDate(new Date(), "GMT-5", "dd/MM/yyyy HH:mm") + " (Local)";
  }

  // Leer Análisis de Valoración desde la Hoja creada por el usuario
  var geminiAnalysis = { positive: "El administrador no ha registrado el análisis aún.", improvement: "El administrador no ha registrado el análisis aún." };
  var insightsSheet = spreadsheet.getSheetByName("Analisis de Valoración");
  
  if (insightsSheet) {
    var positiveText = insightsSheet.getRange("A2").getValue();
    var improvementText = insightsSheet.getRange("B2").getValue();
    
    if (positiveText || improvementText) {
      geminiAnalysis = {
         positive: positiveText || "No hay comentarios positivos registrados.",
         improvement: improvementText || "No hay oportunidades de mejora registradas."
      };
    }
  }

  // --- Leer o crear Hoja "Contenido de Capacitación" ---
  var contenidoCapacitacion = ensureContenidoSheet(spreadsheet);

  var response = {
    kpis: {
      total_courses: coursesOutput.length,
      total_areas: areasOutput.length,
      total_attendees: totalAttendees,
      global_started: globalStarted,
      global_approved: globalApproved,
      participation_rate: totalAttendees > 0 ? (globalStarted / totalAttendees) * 100 : 0,
      approval_rate: totalAttendees > 0 ? (globalApproved / totalAttendees) * 100 : 0,
      average_rating: globalAvgRating,
      ratings_count: globalRatingsCount,
      rating_participation: globalRatingParticipation,
      last_updated: lastUpdatedStr,
      download_url: "https://docs.google.com/spreadsheets/d/" + spreadsheet.getId() + "/export?format=xlsx&gid=" + (spreadsheet.getSheets().length > 0 ? spreadsheet.getSheets()[0].getSheetId() : 0)
    },
    courses: coursesOutput,
    areas: areasOutput,
    ai_insights: geminiAnalysis,
    extra_users: getExtraUsersFromProps(),
    usabilidad_logs: getUsabilidadLogsFromProps(),
    historico_cursos: historicoCursos,
    datos_capacitacion: datosCapacitacion,
    colaboradores_trazabilidad: colaboradoresArray,
    contenido_capacitacion: contenidoCapacitacion,
    gender_stats: {
      femenino: {
        count: genderStats.Femenino.count,
        avg: genderStats.Femenino.count > 0 ? (genderStats.Femenino.sum / genderStats.Femenino.count) : 0,
        pct: globalRatingsCount > 0 ? (genderStats.Femenino.count / globalRatingsCount) * 100 : 0,
        enrolled: genderStats.Femenino.enrolled,
        participation_rate: genderStats.Femenino.enrolled > 0 ? (genderStats.Femenino.count / genderStats.Femenino.enrolled) * 100 : 0
      },
      masculino: {
        count: genderStats.Masculino.count,
        avg: genderStats.Masculino.count > 0 ? (genderStats.Masculino.sum / genderStats.Masculino.count) : 0,
        pct: globalRatingsCount > 0 ? (genderStats.Masculino.count / globalRatingsCount) * 100 : 0,
        enrolled: genderStats.Masculino.enrolled,
        participation_rate: genderStats.Masculino.enrolled > 0 ? (genderStats.Masculino.count / genderStats.Masculino.enrolled) * 100 : 0
      }
    }
  };
  
  var jsonParams = JSON.stringify(response);
  return ContentService.createTextOutput(jsonParams).setMimeType(ContentService.MimeType.JSON);
}



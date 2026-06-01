# Skill: Documentación de Casos de Violencia Política - Banco de Datos del CINEP

## Descripción
Esta skill permite documentar casos de violencia política (violaciones a DD.HH.,
violencia político-social, infracciones al DIHC y acciones bélicas) siguiendo la
metodología del Banco de Datos del CINEP y la Red Nacional de Bancos de Datos de
Derechos Humanos y Violencia Política de Colombia.

## Documentos base requeridos
1. **DTD (`relatos-099.dtd`)**: Define la estructura XML completa de cada relato
2. **Marco conceptual (`marcoteorico.pdf`)**: Contiene categorías, códigos y
   definiciones de violencia
3. **Casos ejemplares**: Al menos 5-10 casos XML de referencia
4. **Tablas básicas (tesauros)**: Vocabularios controlados para contextos,
   organizaciones, responsables, sectores sociales, regiones e intervalos

## Metodología de documentación

### Paso 1: Recepción de la fuente
Se recibe una fuente (noticia de prensa, pronunciamiento de organización social,
denuncia, informe de DDHH, testimonio, etc.).

### Paso 2: Extracción de información
Responder las 9 preguntas fundamentales:
- **¿QUÉ?** El hecho ocurrido
- **¿QUIÉN?** El presunto responsable
- **¿CONTRA QUIÉN?** La víctima (quién era, sector social, antecedentes)
- **¿CÓMO?** Métodos, vehículos, armas, hora, modo
- **¿POR QUÉ?** Móviles que causaron el hecho
- **¿CUÁNDO?** Fecha y hora exactas
- **¿DÓNDE?** Departamento, municipio, vereda, barrio, coordenadas
- **COYUNTURA**: Contexto regional, presencia de actores armados, organizaciones
  sociales
- **LA OTRA VERSIÓN**: Versiones contradictorias (oficial vs. comunitaria)

### Paso 3: Clasificación del hecho
Utilizar el marco conceptual para asignar la categoría correcta según:
- **Autor**: ¿Agente estatal/paraestatal? → DD.HH. (códigos A...)
- **Autor no estatal/no identificado con móvil político** → Violencia
  Político-Social (códigos B...)
- **Contexto de conflicto armado** → Infracciones al DIHC (códigos D...) o
  Acciones Bélicas (códigos C...)

---

## CATÁLOGO COMPLETO DE CATEGORÍAS DEL MARCO CONCEPTUAL

### I. VIOLACIONES A LOS DERECHOS HUMANOS (DD.HH.)
**Autor:** Agentes directos o indirectos del Estado (por acción, aquiescencia o
falta de garantía).

#### A. Violaciones con móvil de PERSECUCIÓN POLÍTICA

| Derecho | Código | Nombre | Descripción |
|---------|--------|--------|-------------|
| **VIDA** | A10 | EJECUCIÓN EXTRAJUDICIAL | Homicidio deliberado por razones
políticas con complicidad estatal |
| | A16 | ATENTADO | Intento de destruir la vida o afectar integridad física
intencionalmente |
| | A15 | AMENAZA INDIVIDUAL | Manifestación de violencia contra persona que la
coloca como víctima potencial |
| | A18 | AMENAZA COLECTIVA | Manifestación de violencia contra un grupo que lo
coloca como víctima potencial |
| **INTEGRIDAD** | A12 | TORTURA | Infligir dolores o sufrimientos graves para
obtener información o castigar |
| | A13 | LESIÓN FÍSICA | Heridas o lesiones infligidas como castigo o
intimidación |
| | A17 | COLECTIVO LESIONADO | Número plural de lesionados no identificados
personalmente |
| | A19 | VIOLENCIA SEXUAL | Violencia sexual con fines de intimidación,
degradación o castigo |
| | A191 | VIOLACIÓN | Invasión física de naturaleza sexual coercitiva |
| | A192 | EMBARAZO FORZADO | Confinamiento de mujer violada hasta el parto |
| | A193 | PROSTITUCIÓN FORZADA | Obligar a actos sexuales para ventajas
pecuniarias |
| | A194 | ESTERILIZACIÓN FORZADA | Privar de capacidad reproductiva bajo
coerción |
| | A195 | ESCLAVITUD SEXUAL | Ejercer dominio sobre persona para actos sexuales
|
| | A196 | ABUSO SEXUAL | Acto sexual coercitivo, incluyendo desnudo forzado |
| | A197 | ABORTO FORZADO | Interrupción del embarazo sin consentimiento por
violencia |
| **LIBERTAD** | A11 | DESAPARICIÓN FORZADA | Privación de libertad seguida de
negación de información sobre paradero |
| | A14 | DETENCIÓN ARBITRARIA | Privación de libertad por razones no
contempladas en ley penal |
| | A141 | JUDICIALIZACIÓN ARBITRARIA | Infringir garantías procesales en juicio
penal por razones políticas |
| | A101 | DEPORTACIÓN | Retorno forzado a su patria de personas protegidas |
| | A102 | DESPLAZAMIENTO FORZADO COLECTIVO | Migración forzada por amenazas a
vida, integridad o libertad |
| | A104 | CONFINAMIENTO | Impedir movilidad como castigo colectivo o represalia
|

#### B. Violaciones con móvil de ABUSO DE AUTORIDAD

| Derecho | Código | Nombre | Descripción |
|---------|--------|--------|-------------|
| **VIDA** | A20 | EJECUCIÓN EXTRAJUDICIAL | Por abuso de autoridad |
| | A26 | ATENTADO | Por abuso de autoridad |
| | A25 | AMENAZA INDIVIDUAL | Por abuso de autoridad |
| | A28 | AMENAZA COLECTIVA | Por abuso de autoridad |
| **INTEGRIDAD** | A22 | TORTURA | Por abuso de autoridad |
| | A23 | LESIÓN FÍSICA | Por abuso de autoridad |
| | A231 | COLECTIVO LESIONADO | Por abuso de autoridad |
| | A29 | VIOLENCIA SEXUAL | Por abuso de autoridad (subcategorías A291-A296) |
| **LIBERTAD** | A21 | DESAPARICIÓN FORZADA | Por abuso de autoridad |
| | A24 | DETENCIÓN ARBITRARIA | Por abuso de autoridad |
| | A241 | JUDICIALIZACIÓN ARBITRARIA | Por abuso de autoridad |
| | A27 | DESPLAZAMIENTO FORZADO | Por abuso de autoridad |

#### C. Violaciones con móvil de INTOLERANCIA SOCIAL

| Derecho | Código | Nombre | Descripción |
|---------|--------|--------|-------------|
| **VIDA** | A30 | EJECUCIÓN EXTRAJUDICIAL | Por intolerancia social |
| | A37 | ATENTADO | Por intolerancia social |
| | A35 | AMENAZA INDIVIDUAL | Por intolerancia social |
| | A38 | AMENAZA COLECTIVA | Por intolerancia social |
| **INTEGRIDAD** | A36 | TORTURA | Por intolerancia social |
| | A33 | LESIÓN FÍSICA | Por intolerancia social |
| | A331 | COLECTIVO LESIONADO | Por intolerancia social |
| | A39 | VIOLENCIA SEXUAL | Por intolerancia social (subcategorías A391-A397) |
| **LIBERTAD** | A302 | DESAPARICIÓN FORZADA | Por intolerancia social |
| | A301 | DETENCIÓN ARBITRARIA | Por intolerancia social |
| | A341 | JUDICIALIZACIÓN ARBITRARIA | Por intolerancia social |
| | A34 | DESPLAZAMIENTO FORZADO | Por intolerancia social |

---

### II. VIOLENCIA POLÍTICO-SOCIAL
**Autor:** Personas o grupos no estatales (o no identificados), excepto
insurgentes en combate.

#### A. Con móvil de PERSECUCIÓN POLÍTICA

| Derecho | Código | Nombre | Descripción |
|---------|--------|--------|-------------|
| **VIDA** | B40 | ASESINATO POLÍTICO | Privación de vida por particulares o
autores no identificados por razones políticas |
| | B46 | ATENTADO | Intento de destruir la vida por móviles políticos |
| | B45 | AMENAZA INDIVIDUAL | Manifestación de violencia contra persona por
móviles políticos |
| | B49 | AMENAZA COLECTIVA | Manifestación de violencia contra grupo por
móviles políticos |
| **INTEGRIDAD** | B47 | TORTURA | Dolores o sufrimientos graves por razones
políticas |
| | B43 | LESIÓN FÍSICA | Lesiones por razones políticas |
| | B402 | COLECTIVO LESIONADO | Varios lesionados no identificados por atentado
político |
| | B420 | VIOLENCIA SEXUAL | Violencia sexual para reprimir posiciones
políticas |
| | B421 | VIOLACIÓN | Violación por persecución política |
| | B422 | EMBARAZO FORZADO | Embarazo forzado por persecución política |
| | B423 | PROSTITUCIÓN FORZADA | Prostitución forzada por persecución política
|
| | B424 | ESTERILIZACIÓN FORZADA | Esterilización forzada por persecución
política |
| | B425 | ESCLAVITUD FORZADA | Esclavitud sexual por persecución política |
| | B426 | ABUSO SEXUAL | Abuso sexual por persecución política |
| | B427 | ABORTO FORZADO | Aborto forzado por persecución política |
| **LIBERTAD** | B41 | SECUESTRO POR INSURGENCIA | Privación de libertad por
insurgentes para financiación o impacto político |
| | B48 | RAPTO POR MÓVILES POLÍTICOS | Ocultamiento contra voluntad por móviles
políticos |
| | B401 | DESPLAZAMIENTO FORZADO COLECTIVO | Migración forzada por violencia
política sin autoría identificable |

#### B. Con móvil de INTOLERANCIA SOCIAL

| Derecho | Código | Nombre | Descripción |
|---------|--------|--------|-------------|
| **VIDA** | B50 | ASESINATO POR INTOLERANCIA SOCIAL | Privación de vida de
personas consideradas disfuncionales |
| | B57 | ATENTADO POR INTOLERANCIA SOCIAL | Atentado por intolerancia social |
| | B55 | AMENAZA INDIVIDUAL | Amenaza individual por intolerancia social |
| | B59 | AMENAZA COLECTIVA | Amenaza colectiva por intolerancia social |
| **INTEGRIDAD** | B56 | TORTURA | Tortura por intolerancia social |
| | B53 | LESIÓN FÍSICA | Lesión por intolerancia social |
| | B502 | COLECTIVO LESIONADO | Varios lesionados por intolerancia social |
| | B520 | VIOLENCIA SEXUAL | Violencia sexual por intolerancia social |
| | B521 | VIOLACIÓN | Violación por intolerancia social |
| | B522 | EMBARAZO FORZADO | Embarazo forzado por intolerancia social |
| | B523 | PROSTITUCIÓN FORZADA | Prostitución forzada por intolerancia social |
| | B524 | ESTERILIZACIÓN FORZADA | Esterilización forzada por intolerancia
social |
| | B525 | ESCLAVITUD FORZADA | Esclavitud sexual por intolerancia social |
| | B526 | ABUSO SEXUAL | Abuso sexual por intolerancia social |
| | B527 | ABORTO FORZADO | Aborto forzado por intolerancia social |
| **LIBERTAD** | B58 | RAPTO POR INTOLERANCIA SOCIAL | Ocultamiento por razones
de intolerancia social |
| | B501 | DESPLAZAMIENTO COLECTIVO | Migración forzada por intolerancia social
|

---

### III. INFRACCIONES GRAVES AL DERECHO INTERNACIONAL HUMANITARIO
CONSUETUDINARIO (DIHC)
**Autor:** Partes en conflicto armado (Estado o Insurgencia) que violan las
"leyes de la guerra".

#### A. Ataques a objetivos ilícitos de guerra

| Código | Nombre | Descripción |
|--------|--------|-------------|
| D90 | ATAQUE INDISCRIMINADO | Ataque que no distingue entre objetivos
militares y civiles |
| D707 | ATACAR O IMPEDIR MISIÓN MÉDICA O SANITARIA | Atacar personal, unidades
o transporte sanitario |
| D708 | ATACAR O IMPEDIR MISIÓN RELIGIOSA | Atacar personal religioso
exclusivamente destinado a actividades religiosas |
| D709 | ATACAR O IMPEDIR MISIÓN HUMANITARIA | Atacar personal o bienes de
socorro humanitario |
| D710 | ATACAR O IMPEDIR MISIONES DE PAZ | Atacar personal y bienes de misiones
de paz |
| D711 | ATACAR O IMPEDIR MISIÓN INFORMATIVA | Atacar periodistas civiles en
zonas de conflicto |
| D712 | ATAQUE A ZONAS HUMANITARIAS | Atacar zonas establecidas para proteger
civiles |
| D85 | ATAQUE A BIENES CULTURALES | Destruir o dañar monumentos históricos,
obras artísticas |
| D801 | ATAQUE A OBRAS CON FUERZAS PELIGROSAS | Atacar presas, diques,
centrales nucleares |
| D84 | ATAQUE AL MEDIO AMBIENTE NATURAL | Causar daños extensos, duraderos y
graves al medio ambiente |

#### B. Empleo de métodos ilícitos de guerra

| Código | Nombre | Descripción |
|--------|--------|-------------|
| D905 | GUERRA SIN CUARTEL | Conducir hostilidades sin contemplación, atacar a
quien está fuera de combate |
| D95 | PILLAJE | Saqueo y destrucción de bienes del adversario o población
civil |
| D86 | HAMBRE COMO MÉTODO DE GUERRA | Hacer padecer hambre a población civil |
| D91 | PERFIDIA | Usar la buena fe del adversario para traicionarlo |
| D713 | IMPEDIR CONVERSACIONES DE PAZ | Obstaculizar contactos no hostiles o
mediación |

#### C. Empleo de medios ilícitos de guerra

| Código | Nombre | Descripción |
|--------|--------|-------------|
| D92 | ARMAS ABSOLUTAMENTE PROHIBIDAS | Uso de armas envenenadas, biológicas,
químicas, balas expansivas, etc. |
| D93 | ARMAS DE USO RESTRINGIDO | Uso ilícito de minas terrestres, armas
incendiarias |

#### D. Trato afrentoso al ser humano

| Código | Nombre | Descripción |
|--------|--------|-------------|
| D701 | HOMICIDIO INTENCIONAL DE PERSONA PROTEGIDA | Homicidio de no
combatientes o fuera de combate |
| D97 | MUERTE POR MÉTODOS Y MEDIOS ILÍCITOS | Muerte derivada de métodos/medios
prohibidos |
| D87 | MUERTE POR ATAQUE A BIENES CIVILES | Muerte como consecuencia de ataque
a bienes civiles |
| D703 | MUERTE DE CIVIL EN ACCIÓN BÉLICA | Civil muerto en fuego cruzado |
| D702 | LESIONES INTENCIONALES A PERSONA PROTEGIDA | Heridas intencionales a no
combatientes |
| D98 | LESIONES POR MÉTODOS O MEDIOS ILÍCITOS | Lesiones derivadas de
métodos/medios prohibidos |
| D88 | LESIONES POR ATAQUE A BIENES CIVILES | Lesiones como consecuencia de
ataque a bienes civiles |
| D704 | LESIONES A CIVILES EN ACCIÓN BÉLICA | Civiles heridos en fuego cruzado
|
| D705 | COLECTIVO LESIONADO POR INFRACCIONES AL DIHC | Varios lesionados no
identificados por infracciones al DIHC |
| D72 | TORTURA Y TRATOS CRUELES | Tortura, tratos humillantes como instrumento
de guerra |
| D77 | VIOLENCIA SEXUAL COMO INSTRUMENTO DE GUERRA | Violencia sexual (D771
violación, D772 embarazo forzado, D773 prostitución forzada, D774 esterilización
forzada, D775 esclavitud sexual, D776 abuso sexual, D777 aborto forzado) |
| D714 | ESCLAVITUD Y TRABAJOS FORZADOS | Esclavitud o trabajos forzados en
contexto de guerra |
| D74 | TOMA DE REHENES | Capturar personas para garantizar cumplimiento de
pactos militares |
| D78 | ESCUDOS HUMANOS (INDIVIDUAL) | Usar individuo como escudo |
| D904 | ESCUDOS HUMANOS (COLECTIVO) | Usar colectivo como escudo |
| D76 | DESAPARICIÓN FORZADA COMO INSTRUMENTO DE GUERRA | Desaparición en
contexto de conflicto |
| D15 | JUDICIALIZACIÓN ARBITRARIA | Montajes judiciales como arma de guerra |
| D903 | DESPLAZAMIENTO FORZADO | Desplazamiento forzado como estrategia de
guerra |
| D906 | CONFINAMIENTO | Impedir movilidad de poblaciones como instrumento de
guerra |
| D75 | RECLUTAMIENTO DE MENORES | Reclutar y utilizar menores de 15 años en
hostilidades |
| D716 | DESCONOCIMIENTO DE DERECHOS A PRISIONEROS | Maltrato o negación de
derechos a prisioneros de guerra |
| D717 | NEGACIÓN DE ATENCIÓN A VULNERABLES | Negar cuidados a heridos,
enfermos, mujeres, ancianos |
| D718 | PROFANACIÓN DE CADÁVERES | Profanar, ocultar cadáveres |
| D73 | AMENAZA INDIVIDUAL | Amenaza individual como instrumento de guerra |
| D706 | AMENAZA COLECTIVA | Amenaza colectiva como instrumento de guerra |

---

### IV. ACCIONES BÉLICAS
**Autor:** Partes en conflicto armado (Estado o Insurgencia). Actos que se
ajustan a las "leyes y costumbres de la guerra" (lícitos en principio).

| Código | Nombre | Descripción |
|--------|--------|-------------|
| C62 | COMBATE | Enfrentamiento directo de adversarios con armas |
| C63 | EMBOSCADA | Ataque por sorpresa contra el adversario |
| C64 | USO DE MINAS - CAMPO MINADO | Colocar minas para detonar por presencia
de persona o vehículo |
| C65 | BOMBARDEO - AMETRALLAMIENTO | Ataque aéreo, terrestre o naval con
métodos lícitos |
| C66 | BLOQUEO DE VÍAS | Obstrucción de vías con propósitos militares |
| C67 | ATAQUE A OBJETIVO MILITAR | Ataque contra bienes que contribuyen a
acción militar del adversario |
| C68 | INCURSIÓN | Penetración temporal en territorio controlado por adversario
|
| C69 | SABOTAJE | Destrucción de obras o instalaciones que contribuyen a
eficacia militar del adversario |

#### Registro de Combatientes (en acciones bélicas)

**Polo Estatal:** Muertes, heridas o prisioneros de: Ejército, Armada, Fuerza
Aérea, Policía, GAULA, INPEC, Paramilitares.

**Polo Insurgente:** Muertes, heridas o prisioneros de: Guerrilla, Milicias,
EPL, ELN, ERG, ERP, FARC-EP.

---

### Paso 4: Redacción del memo (etiqueta `<hechos>`)

**Reglas de estilo:**
- Comenzar con **QUIÉN + QUÉ + A QUIÉN** (ej: "Paramilitares ejecutaron a...",
  "Desconocidos asesinaron a...")
- Usar verbos en **tiempo pasado** (ejecutaron, asesinaron, desaparecieron)
- No usar regionalismos, expresiones calificativas o despectivas
- No usar términos militares coloquiales como "dieron de baja"
- Orden de la información: responsable → acción → víctima → circunstancias de
  modo, tiempo y lugar → coyuntura → otra versión
- Las horas se expresan en formato 12 horas (ej: "10:00 a.m.", "9:30 p.m.")
- Las citas textuales van entre comillas
- El memo debe ser objetivo y sin apreciaciones personales

### Paso 5: Estructuración del XML

#### Estructura mínima de un relato:
```xml
<relato>
  <organizacion_responsable>Banco de Datos del CINEP</organizacion_responsable>
  <derechos>Creative Commons Atribución 2.5 Colombia</derechos>
  <id_relato>[NÚMERO]</id_relato>
  <forma_compartir>publico</forma_compartir>
  <titulo>[TÍTULO CORTO ≤50 caracteres]</titulo>
  <hechos>[MEMO]</hechos>
  
  <!-- Víctimas personas individuales -->
  <persona>...</persona>
  
  <!-- Grupos victimizados -->
  <grupo>...</grupo>
  
  <!-- Presuntos responsables -->
  <grupo>...</grupo>
  
  <!-- Registro sociopolítico de víctimas -->
  <victima>...</victima>
  
  <!-- Ubicación -->
  <fecha>YYYY-MM-DD</fecha>
  <hora>HH:MM [AM/PM]</hora> <!-- vacío si no hay dato -->
  <duracion></duracion>
  <departamento>...</departamento>
  <municipio>...</municipio>
  <centro_poblado></centro_poblado> <!-- vacío para zonas rurales -->
  <longitud>...</longitud>
  <latitud>...</latitud>
  
  <!-- Actos (conectar víctima, responsable y agresión) -->
  <acto>...</acto>
  
  <!-- Observaciones -->
  <observaciones tipo="...">...</observaciones>
</relato>
```

#### Reglas de formato por campo:

| Campo | Formato | Observación |
|-------|---------|-------------|
| `<persona>/<nombre>` | MAYÚSCULAS SOSTENIDAS | |
| `<persona>/<apellido>` | MAYÚSCULAS SOSTENIDAS | |
| `<nombre_grupo>` | MAYÚSCULAS SOSTENIDAS | Tanto víctima como responsable |
| `<victima>` (texto libre) | MAYÚSCULAS SOSTENIDAS | ocupacion,
sector_condicion, organizacion, observaciones |
| `<hechos>` (memo) | Altas y bajas (normal) | |
| `<titulo>` | Altas y bajas | Máximo 50 caracteres |
| `<hora>` | Vacío si no hay información | No usar "SIN INFORMACIÓN" |
| `<centro_poblado>` | Vacío si es zona rural | Solo para cabeceras municipales
o corregimientos |
| `<orientacionsexual>` | "S" = SIN INFORMACIÓN | Válido |
| `<fecha_nacimiento>` | "YYYY-MM-DD" o "-00-00" si se desconoce día/mes | |
| `<observaciones tipo="anotaciones">` | Vacío | Es para información
confidencial que no aparece en el memo |
| `<observaciones tipo="grinformacion">` | Vacío | Lo diligencia el sistema, no
el usuario |
| `<observaciones tipo="grconfiabilidad">` | Vacío | Solo después de fallo
judicial (casi nunca) |

#### Vocabularios controlados (tesauros):

**Contextos (`<observaciones tipo="contexto">`):**
```
ABUSO POLICIAL, ACCIONES BÉLICAS, CAMPAÑAS DE INTOLERANCIA, CONFLICTO ARMADO,
CONFLICTOS ESTUDIANTILES, CONFLICTOS LABORALES, CULTIVOS DE USO ILÍCITO,
DESALOJOS, ENCLAVES ECONÓMICOS, ERRADICACIÓN FORZADA, FALSO POSITIVO,
MANIFESTACIONES, MARCHA CAMPESINA, MEGAPROYECTOS, MILITARIZACIÓN,
MINERO ENERGETICO, OCUPACIONES, PARAMILITARIZACIÓN, PARO AGRARIO,
PARO ARMADO, PARO CAMIONERO, PARO CÍVICO, PARO NACIONAL 28 DE ABRIL DE 2021,
PERSECUCIÓN A IGLESIA, PERSECUCIÓN A ORGANIZACIÓN, PRESENCIA DE MILICIAS,
PRESENCIA GUERRILLERA, PROBL. ÉTNICA (NEG.E IN.), PROBLEMÁTICA AMBIENTAL,
PROBLEMÁTICA CARCELARIA, PROBLEMÁTICA FRONTERIZA, PROCESO JUDICIAL,
PROCESOS DE PAZ O DIÁLOGO, PROCESOS ELECTORALES, PROTESTA,
RESTITUCIÓN DE TIERRAS, SEGURIDAD INFORMÁTICA, TOMA DE TIERRAS,
ZONAS DE REHAB. Y CONSOL
```

**Intervalos (`<observaciones tipo="intervalo">`):**
```
MADRUGADA (00:00-05:59), MAÑANA (06:00-12:59), 
TARDE (13:00-18:59), NOCHE (19:00-24:59), SIN INFORMACIÓN
```

**Organizaciones de víctimas (`<organizacion>`):**
```
AMBIENTALISTA, CAMPESINA, CIVICA, COMUNAL, DERECHOS HUMANOS,
DESPLAZADOS, ESTUDIANTIL, FEMENINA, GREMIAL, HUMANITARIA,
INDIGENA, JUVENIL, LGTB, NEGRITUDES, PAZ, PROFESIONAL,
RELIGIOSA, SIN INFORMACIÓN, SINDICAL, VÍCTIMAS
```

**Sectores sociales (`<sector_condicion>`):**
```
AMBIENTALISTA, CAMPESINO, COLONOS, COMERCIANTE, DESEMPLEADO (A),
DESMOVILIZADO(A), EMPLEADO, EMPRESARIO, ESTILISTA, ETNIAS - NEGRITUDES,
EXCOMBATIENTES, GANADERO, HACENDADO, IGLESIAS, INDIGENA, INDUSTRIAL,
LGBT, LIDER(ESA) SOCIAL, MARGINADO, MINERO, OBRERO, PROFESIONAL,
SIN INFORMACIÓN, TRABAJADOR (A) SEXUAL, TRABAJADOR INDEPENDIENTE,
TRANSPORTADOR, VENDEDOR AMBULANTE, VÍCTIMA
```

**Regiones (`<observaciones tipo="region">`):**
```
AMAZONÍA, ANTIOQUIA CHOCO SANT, CENTRO, COSTA ATLANTICA,
COSTA PACIFICA, EJE CAFETERO Y TOLIMA GRANDE, EXTERIOR,
LLANOS, MAGDALENAMEDIOSURDECESARYSURDEBOLIVAR, SUR OCCIDENTE
```

**Presuntos responsables (id_grupo más comunes):**
```
4 = Ejército, 5 = Armada, 6 = Fuerza Aérea, 7 = Policía, 14 = Paramilitares,
25 = Guerrilla, 35 = Sin Información, 38 = Fiscalía, 51 = Presidencia de la
República
```

### Paso 6: Búsqueda de información adicional
Utilizar buscadores con palabras clave: nombre de la víctima, lugar, fecha,
organización responsable. Priorizar fuentes:
1. Informes de DDHH (Human Rights Watch, Indepaz, Comisión Intereclesial de
   Justicia y Paz)
2. Medios locales del Putumayo (Mi Putumayo Noticias, La Noticia Putumayo,
   Diario del Sur)
3. Medios nacionales (Caracol Radio, Infobae, Blu Radio, El Heraldo, W Radio, La
   FM)
4. Fuentes oficiales (Defensoría del Pueblo, Personerías, Fiscalía)
5. Redes sociales (con criterio: contrastar información)

### Paso 7: Validación del caso
Verificar que el XML cumpla con:
- ✅ Estructura definida por el DTD
- ✅ Memo comienza con responsable + acción + víctima
- ✅ Campos de texto libre en mayúsculas sostenidas
- ✅ Ubicación completa (departamento, municipio, coordenadas)
- ✅ Al menos un `<acto>` conectando víctima, responsable y agresión
- ✅ Responsable: si no se conoce, usar `id_grupo=35` (Sin Información)
- ✅ Campos vacíos cuando no hay información (no usar "SIN INFORMACIÓN" excepto
  cuando el tesauro lo requiera)

---

## EJEMPLO COMPLETO DE CASO

**Fuente:** Caracol Radio, 8 de septiembre de 2025: "Asesinan a líder social en
Puerto Guzmán al iniciar la Semana por la Paz"

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE relatos SYSTEM
"http://sincodh.pasosdejesus.org/relatos-099.dtd">
<relatos>
     <relato>
       <organizacion_responsable>Banco de Datos del
CINEP</organizacion_responsable>
       <derechos>Creative Commons Atribución 2.5 Colombia.
http://creativecommons.org/licenses/by/2.5/co/</derechos>
       <id_relato>172384</id_relato>
       <forma_compartir>publico</forma_compartir>
       <titulo>Jhon Fredy Rico, líder social, asesinado en Puerto
Guzmán</titulo>
       <hechos>Presuntos integrantes del grupo paramilitar Comandos de la
Frontera asesinaron al líder social y defensor de derechos humanos Jhon Fredy
Rico, miembro del Comité de Derechos Humanos de la Junta de Acción Comunal de la
vereda La Victoria, corregimiento José María, municipio de Puerto Guzmán. El
hecho ocurrió hacia las 10:00 de la mañana del 7 de septiembre de 2025, cuando
la víctima se desplazaba hacia su vivienda después de dejar a su hijo en un
partido de fútbol y fue interceptada por los agresores, quienes le dispararon en
la cabeza con una escopeta. Según investigación de Human Rights Watch, el
asesinato fue en represalia por su participación en un evento relacionado con
las negociaciones de paz entre el gobierno y el EMBF, un grupo opositor a
Comandos de la Frontera. Rico había participado activamente desde abril de 2025
en la agenda de Paz y Derechos Humanos en escenarios locales y nacionales. El
asesinato ocurrió el mismo día en que iniciaba la Semana por la Paz, resaltando
paradójicamente el valiente compromiso de Jhon Fredy Rico en la construcción de
un Putumayo más justo y en paz, como señaló el medio local Mi Putumayo Noticias.
Organizaciones sociales exigieron a las autoridades investigaciones rápidas,
medidas efectivas de protección y garantías para la vida de quienes trabajan por
los procesos de paz.</hechos>
       
       <!-- Víctima persona individual -->
       <persona>
         <id_persona>269269</id_persona>
         <nombre>JHON FREDY</nombre>
         <apellido>RICO</apellido>
         <fecha_nacimiento>SIN INFORMACIÓN</fecha_nacimiento>
         <sexo>M</sexo>
         <observaciones tipo="etnia">SIN INFORMACIÓN</observaciones>
       </persona>
       
       <!-- Presuntos responsables -->
       <grupo>
         <id_grupo>14</id_grupo>
         <nombre_grupo>PARAMILITARES</nombre_grupo>
         <observaciones tipo="subdivision"></observaciones>
         <observaciones tipo="bloque"></observaciones>
         <observaciones tipo="frente"></observaciones>
         <observaciones tipo="otro">COMANDOS DE LA FRONTERA</observaciones>
       </grupo>
       
       <!-- Víctima individual (registro sociopolítico) -->
       <victima>
         <id_persona>269269</id_persona>
         <ocupacion>DEFENSOR/A DE DDHH</ocupacion>
         <sector_condicion>LIDER(ESA) SOCIAL</sector_condicion>
         <iglesia>SIN INFORMACIÓN</iglesia>
         <organizacion>COMUNAL</organizacion>
         <observaciones tipo="filiacion">SIN INFORMACIÓN</observaciones>
         <observaciones tipo="orientacionsexual">S</observaciones>
         <observaciones tipo="vinculoestado">SIN INFORMACIÓN</observaciones>
         <observaciones tipo="hijos">1</observaciones>
         <observaciones tipo="anotaciones"></observaciones>
         <observaciones tipo="organizacion_armada">35</observaciones>
         <observaciones tipo="rangoedad">SIN INFORMACIÓN</observaciones>
       </victima>
       
       <!-- Ubicación -->
       <fecha>2025-09-07</fecha>
       <hora>10:00</hora>
       <duracion></duracion>
       <departamento>Putumayo</departamento>
       <municipio>Puerto Guzmán</municipio>
       <centro_poblado>JOSÉ MARÍA</centro_poblado>
       <longitud>-76.0</longitud>
       <latitud>0.5</latitud>
       
       <!-- Acto con víctima individual -->
       <acto>
         <agresion>VIDA</agresion>
         <agresion_particular>EJECUCIÓN EXTRAJUDICIAL (10)</agresion_particular>
         <id_victima_individual>269269</id_victima_individual>
         <id_presunto_responsable_individual>14</id_presunto_responsable_individual>
       </acto>
       
       <!-- Otros -->
       <observaciones tipo="grconfiabilidad"></observaciones>
       <observaciones tipo="gresclarecimiento"></observaciones>
       <observaciones tipo="grimpunidad"></observaciones>
       <observaciones tipo="grinformacion"></observaciones>
       <observaciones tipo="bienes"></observaciones>
       <observaciones tipo="intervalo">MAÑANA</observaciones>
       <observaciones tipo="region">AMAZONÍA</observaciones>
       <observaciones tipo="frontera">SIN INFORMACIÓN</observaciones>
       <observaciones tipo="sitio">VÍA PÚBLICA</observaciones>
       <observaciones tipo="lugar">VEREDA LA VICTORIA, CORREGIMIENTO JOSÉ
MARÍA</observaciones>
       <observaciones tipo="tsitio">RURAL</observaciones>
       <observaciones tipo="contexto">PERSECUCIÓN A ORGANIZACIÓN;PROCESOS DE PAZ
O DIÁLOGO</observaciones>
     </relato>
</relatos>
```

---

## Errores comunes

### Campos que van vacíos, NO "SIN INFORMACIÓN"

| Campo | Regla |
|-------|-------|
| `<hora>` | Vacío si no se conoce |
| `<centro_poblado>` | Vacío si es zona rural (solo para cabeceras/corregimientos) |
| `<observaciones tipo="anotaciones">` | Vacío — es para información confidencial |
| `<observaciones tipo="grinformacion">` | Vacío — lo llena el sistema |
| `<observaciones tipo="grconfiabilidad">` | Vacío — solo tras fallo judicial |
| `<duracion>` | Vacío si no aplica |

### Campos que SÍ usan "SIN INFORMACIÓN"

| Campo | Nota |
|-------|------|
| `<fecha_nacimiento>` | Usar `-00-00` si se desconoce día/mes |
| `<observaciones tipo="etnia">` | `SIN INFORMACIÓN` |
| `<observaciones tipo="filiacion">` | `SIN INFORMACIÓN` |
| `<observaciones tipo="vinculoestado">` | `SIN INFORMACIÓN` |
| `<observaciones tipo="rangoedad">` | `SIN INFORMACIÓN` |
| `<observaciones tipo="frontera">` | `SIN INFORMACIÓN` |
| `<orientacionsexual>` | `S` = SIN INFORMACIÓN |
| `<organizacion>` | `SIN INFORMACIÓN` |
| `<sector_condicion>` | `SIN INFORMACIÓN` |
| `<iglesia>` | `SIN INFORMACIÓN` |
| `id_grupo` | `35` = Sin Información |

### Errores frecuentes en el memo (`<hechos>`)

- ❌ No comenzar con responsable + acción + víctima
- ❌ Usar tiempo presente en lugar de pasado
- ❌ Incluir opiniones o calificativos ("lamentablemente", "cruel")
- ❌ Usar regionalismos o jerga militar ("dieron de baja" → "ejecutaron")
- ❌ Exceder 50 caracteres en `<titulo>`
- ❌ Usar minúsculas en campos que requieren MAYÚSCULAS SOSTENIDAS

### Errores frecuentes en estructura XML

- ❌ `<acto>` sin `id_victima_individual` o `id_presunto_responsable_individual`
- ❌ Responsable no identificado sin usar `id_grupo=35`
- ❌ `<ubicacion_secundaria>` incompleta (falta departamento y municipio)
- ❌ `<fuente>` sin `nombre_fuente`
- ❌ `<persona>` sin `id_persona` o con `id_persona` repetido

---

## Notas importantes
- La memoria es un acto de fe en la paz: documentar es resistir al olvido
- Todos los casos deben ser tratados con respeto a las víctimas y sus familias
- La objetividad no está reñida con la sensibilidad humana
- La metodología prioriza la verdad sobre la velocidad

## Contacto y referencias
- Banco de Datos del CINEP: https://www.cinep.org.co
- Marco conceptual: https://www.cinep.org.co/publicaciones
- DTD: http://sincodh.pasosdejesus.org/relatos-099.dtd

---

## Apéndice A: DTD (relatos-099.dtd)

```dtd
<!ELEMENT relatos (relato+)>

<!ELEMENT relato (organizacion_responsable, derechos, id_relato, forma_compartir, titulo?, hechos, persona*, grupo*, victima*, presunto_responsable_individual*, fecha?, hora?, duracion?, ubicacion_secundaria*, departamento?, municipio?, centro_poblado?, longitud?, latitud?, acto*, contexto?, fuente*, acciones_juridicas?, otras_acciones?, fecha_publicacion?, anexo?, combatiente*, observaciones*)>

<!ELEMENT organizacion_responsable (#PCDATA)>

<!ELEMENT derechos (#PCDATA)>

<!ELEMENT id_relato (#PCDATA)>

<!ELEMENT forma_compartir (#PCDATA)>

<!ELEMENT titulo (#PCDATA)>

<!ELEMENT hechos (#PCDATA)>

<!ELEMENT persona (id_persona, nombre?, nombre2?, apellido?, apellido2?, docid?, fecha_nacimiento?, sexo?, observaciones*)>

<!ELEMENT id_persona (#PCDATA)>

<!ELEMENT nombre (#PCDATA)>

<!ELEMENT nombre2 (#PCDATA)>

<!ELEMENT apellido (#PCDATA)>

<!ELEMENT apellido2 (#PCDATA)>

<!ELEMENT docid (#PCDATA)>

<!ELEMENT fecha_nacimiento (#PCDATA)>

<!ELEMENT sexo (#PCDATA)>

<!ELEMENT observaciones (#PCDATA)>
<!ATTLIST observaciones
  tipo CDATA #IMPLIED
>
<!ELEMENT grupo (id_grupo, nombre_grupo?, sigla?, subgrupo_de?, agresion_sin_vicd*, observaciones*)>

<!ELEMENT id_grupo (#PCDATA)>

<!ELEMENT nombre_grupo (#PCDATA)>

<!ELEMENT sigla (#PCDATA)>

<!ELEMENT subgrupo_de (#PCDATA)>

<!ELEMENT agresion_sin_vicd (#PCDATA)>

<!ELEMENT victima (id_persona, ocupacion?, sector_condicion?, iglesia?, organizacion?, id_grupo?, estado_tras_hecho?, danio_directo?, danio_indirecto?, personas_dependientes?, observaciones*)>

<!ELEMENT ocupacion (#PCDATA)>

<!ELEMENT sector_condicion (#PCDATA)>

<!ELEMENT iglesia (#PCDATA)>

<!ELEMENT organizacion (#PCDATA)>

<!ELEMENT estado_tras_hecho (#PCDATA)>

<!ELEMENT danio_directo (#PCDATA)>

<!ELEMENT danio_indirecto (#PCDATA)>

<!ELEMENT personas_dependientes (#PCDATA)>

<!ELEMENT presunto_responsable_individual (id_persona, id_grupo?, alias?, agresion_sin_vicd*, observaciones*)>

<!ELEMENT alias (#PCDATA)>

<!ELEMENT fecha (#PCDATA)>

<!ELEMENT hora (#PCDATA)>

<!ELEMENT duracion (#PCDATA)>

<!ELEMENT ubicacion_secundaria (departamento?, municipio?, centro_poblado?, longitud?, latitud?, observaciones*)>

<!ELEMENT departamento (#PCDATA)>

<!ELEMENT municipio (#PCDATA)>

<!ELEMENT centro_poblado (#PCDATA)>

<!ELEMENT longitud (#PCDATA)>

<!ELEMENT latitud (#PCDATA)>

<!ELEMENT acto (agresion, agresion_particular?,  (id_victima_individual | id_grupo_victima) ,  (id_presunto_grupo_responsable | id_presunto_responsable_individual) )>

<!ELEMENT agresion (#PCDATA)>

<!ELEMENT agresion_particular (#PCDATA)>

<!ELEMENT id_victima_individual (#PCDATA)>

<!ELEMENT id_grupo_victima (#PCDATA)>

<!ELEMENT id_presunto_grupo_responsable (#PCDATA)>

<!ELEMENT id_presunto_responsable_individual (#PCDATA)>

<!ELEMENT contexto (#PCDATA)>

<!ELEMENT fuente (nombre_fuente, fecha_fuente?, ubicacion_fuente?, observaciones*)>

<!ELEMENT nombre_fuente (#PCDATA)>

<!ELEMENT fecha_fuente (#PCDATA)>

<!ELEMENT ubicacion_fuente (#PCDATA)>

<!ELEMENT acciones_juridicas (observaciones*)>

<!ELEMENT otras_acciones (#PCDATA)>

<!ELEMENT fecha_publicacion (#PCDATA)>

<!ELEMENT anexo (observaciones*)>

<!ELEMENT combatiente (nombre?, alias?, edad?, sexo?, ocupacion?, filiacion?, sector_condicion?, organizacion?, organizacion_armada?, resultado_agresion?, observaciones*)>

<!ELEMENT edad (#PCDATA)>

<!ELEMENT filiacion (#PCDATA)>

<!ELEMENT organizacion_armada (#PCDATA)>

<!ELEMENT resultado_agresion (#PCDATA)>
```


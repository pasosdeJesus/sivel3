# Visión: SIVeL 3 - Un protocolo para atestiguar violencia socio política de forma ética

## 1. Principios Fundamentales

SIVeL 3 se rige por los siguientes principios formulados por el
sacerdote Javier Giraldo

- **Dignidad humana inalienable** – La información sobre violaciones
  de derechos humanos pertenece a las víctimas y a la sociedad. Debe
  ser libre y abierta.
- **Acceso universal gratuito** – El público general y las víctimas nunca
  pagan por acceder a los casos documentados.
- **Código abierto y auditable** – Licencia ISC para el código fuente y
  licencia CC/BY para los datos.
- **Reserva de fuentes de información** por seguridad personal.
- **Alineación con el Derecho Internacional Humanitario** – Clasificación
  según el marco conceptual del Banco de Datos del CINEP.
- **No comercialización de datos de víctimas** – Los ingresos provienen
  de servicios institucionales y créditos, no de la venta de información.

---

## 2. Resumen

SIVeL 3 es un protocolo Web3 pionero diseñado para transformar la
documentación ética de la violencia sociopolítica. Estamos creando un
ecosistema autosostenible, operando desde **https://sivel.xyz**,
financiado mediante un modelo híbrido que combina donaciones,
 servicios de valor agregado para usuarios institucionales,
incentivos basados en créditos y un mercado de pre-alertas donde
los ciudadanos compran y mejoran alertas generadas por IA. Las
operaciones iniciales son apoyadas por el capital propio del fundador
hasta que el modelo alcance ingresos sostenibles.

El sistema empodera a un **agente IA** para detectar autónomamente
eventos potenciales en fuentes públicas, permite que ciudadanos
testigos verifiquen y mejoren esas alertas, los recompensa por sus
contribuciones, proporciona un camino para que investigadores
profesionales accedan a datos valiosos, y establece un registro
inmutable y certificado en blockchain de los eventos en la red Celo.

**Crucialmente, SIVeL 3 nunca cobra a víctimas o al público general
por acceder a los datos de los casos.** La información sobre
violaciones de derechos humanos pertenece a las víctimas y a la
sociedad; debe permanecer libre y abierta. Los usuarios profesionales
(investigadores, periodistas, empresas de seguridad, agencias
gubernamentales) que requieren acceso masivo o datos sensibles
pueden contribuir a la sostenibilidad de la plataforma.

---

## 3. Actores y Roles del Ecosistema

SIVeL 3 introduce un ecosistema de múltiples niveles donde cada rol está
definido por Soul-Bound Tokens (SBTs) no transferibles:

### 3.1 Roles Comunitarios

- **Público general** – Explora casos en un mapa interactivo, visualiza
  datos agregados. Acceso gratuito, sin necesidad de wallet.

- **Ciudadanos (alertadores)** – Navegan por las pre-alertas disponibles,
  compran acceso a una pre-alerta por una tarifa pequeña (desincentiva el
  spam), investigan el evento usando sus propias fuentes, mejoran la
  pre-alerta con información verificada (fotos, ubicación exacta, testimonio)
  y la envían como **alerta ciudadana**. Si es verificada, reciben una
  recompensa.
  También pueden enviar alertas directas sin pasar por una pre-alerta si
  tienen información de primera mano de un caso no descubierto por el agente IA.

- **Víctimas o familiares** – Pueden **registrarse** y **reclamar un caso**
  existente (ya publicado por el Banco de Datos) y entrevistarse con un
  documentador o personal del validador para verificarlo. Al hacerlo, reciben
  una **compensación simbólica de $5** (sujeta a disponibilidad en el
  Fondo de Restauración o entrando a una fila para recibir el pago cuando
  haya recursos en ese fondo), sus billeteras son registradas para
  posibles donaciones para su caso, y futuras reparaciones o auxilios
  sin necesidad de mantener en línea su información personal.  Si por
  razones de seguridad o privacidad lo prefieren, pueden solicitar
  que el nombre de la víctima sea anonimizado en sivel.xyz (de forma
  permanente o temporal).

### 3.2 Roles Operativos

- **Agente IA** – Monitorea autonomamente fuentes públicas (noticias, RSS,
  APIs) para detectar posibles violaciones de derechos humanos.
  Genera **pre-alertas** (reportes estructurados en JSON siguiendo la
  metodología del Banco de Datos del CINEP) y las publica en una sección de
  sivel.xyz

- **Documentadores** – Investigan las alertas ciudadanas, las transforman en
  casos estructurados y participan en revisión por pares. No son trabajadores
  ni voluntarios del validador. Reciben una donación por caso documentado 
  desde el fondo de alertas y documentadores ($5–$20 por caso, según 
  disponibilidad).  También ayudan a certificar víctimas y familiares 
  cuando reclaman un caso. Si el sistema alcanza estabilidad financiera, 
  recibirán un estipendio mensual en lugar de retribución por caso. Para 
  Colombia, los miembros de la Red de Bancos de Datos ya están capacitados 
  en la metodología y basta que registren su billetera para recibir el SBT 
  de Documentador y ser preferidos para autenticar víctimas de su región.

- **Validadores Regionales de Publicación** (ej. Banco de Datos de Violencia
  Política del CINEP en Colombia) – Organización reconocida en derechos
  humanos que realiza la auditoría final para su región y certifica los
  casos en la blockchain de Celo. Mantiene su propio sistema de información
  interno con acceso completo a todos los datos de su región. También ayuda
  a autenticar víctimas y familiares cuando reclaman un caso.

### 3.3 Roles Profesionales y Financiadores

- **Usuarios profesionales** (investigadores, periodistas, empresas de
  seguridad, instituciones) – Acceden a la base de datos de casos y
  herramientas especializadas mediante un **sistema de suscripción o
  créditos** (ver sección 5). Pueden comprar créditos (p.ej., $10 por
  240 casos/mes) o suscripciones mensuales.

- **Donantes** – Donan USDT para documentar casos en regiones específicas o
  como micro-reparación a víctimas registradas en la plataforma. Reciben
  reconocimiento y créditos de cortesía. No tienen derechos de gobernanza,
  pero pueden ser elegidos para consejos regionales con un voto
  (independientemente del monto donado).

---

## 4. Agente IA y Mercado de Pre-alertas

El agente IA es una innovación central de SIVeL 3:

1. **Monitorea fuentes públicas** (RSS, API de ReliefWeb, HRW,
Amnistía, etc.) sin costo.
2. **Detecta eventos potenciales** usando un LLM pequeño que corre en
  hardware proporcionado inicialmente por el Banco de Datos del CINEP.
3. **Genera pre-alertas** – reportes estructurados en JSON siguiendo
  la metodología del Banco de Datos – y las publica en la sección para
  esto de sivel.xyz con certificación en el blockchain.
4. **Verifica duplicados** consultando la base de datos existente,
  asegurando que no se publiquen pre-alertas redundantes.

**Mercado de pre-alertas:**

- Los ciudadanos navegan por las pre-alertas disponibles en un mapa
  interactivo.
- Para acceder a los detalles completos, el ciudadano paga una tarifa
  pequeña (actualmente **$1.00 USDT**, ajustable para equilibrar
  accesibilidad y sostenibilidad a largo plazo).
- Tras la compra, el ciudadano investiga, mejora y envía la pre-alerta
  como alerta ciudadana.
- Si un Documentador verifica la alerta, el ciudadano recibe una
  recompensa de **$2 (validación simple) a $5 (investigación completa)**
  según la significancia de su contribución.
- El fondo de recompensas es transparente: la dirección del contrato
  es pública; cualquiera puede verificar los fondos y seguir los
  pagos a billeteras (sin información personal).

---

## 5. Niveles de Acceso y Precios

| Nivel | Acceso | Precio | Audiencia |
| :--- | :--- | :--- | :--- |
| **Gratuito (sin wallet)** | Mapa + 8 casos/mes (1/día) | $0 | Visitantes ocasionales |
| **Gratuito (con wallet)** | 16 casos/mes (2/día) | $0 | Registrados con wallet |
| **Gratuito (con wallet verificada)** | 24 casos/mes (3/día) | $0 | Registrados y verificados en learn.tg |
| **Investigador Básico** (wallet verificada) | 240 casos/mes + API | $10 USDT/mes | Académicos, periodistas |
| **Profesional** (wallet verificada) | 1,000 casos/mes + API completa | $40 USDT/mes | ONGs, empresas de seguridad |
| **Institucional** (wallet verificada del representante) | Personalizado (exportación masiva, soporte prioritario) | $200-500 USDT/mes | Gobiernos, universidades |

---

## 6. Modelo Financiero y Distribución de Ingresos

Los porcentajes se aplican desde el primer dólar recibido (incluyendo
donaciones).

| Destinatario | Porcentaje | Notas |
| :--- | :--- | :--- |
| **Banco de Datos del CINEP** | 20% | Acceso a datos, metodología, proceso interno |
| **Pasos de Jesús (operador)** | 30% | Tope de **$1,500 USD por mes**. Operación, desarrollo, hospedaje, agente IA, capital semilla |
| **Documentadores Independientes** | 30% | $5–$20 por caso verificado (trabajo en territorio), según donaciones recibidas |
| **Fondo de Restauración (víctimas)** | 5% | Bono de bienvenida, reparaciones, eventos conmemorativos, reforestación |
| **Fondo de Iglesias** | 5% | Iglesias pacifistas verificadas (a través de learn.tg) |
| **Reinversión** | 10% | Marketing, nuevas funcionalidades, hackathones |

**Mecanismo de tope (cap):** Si el 30% de los ingresos mensuales
para pdJ supera los $1,500 USD, el excedente se distribuye en partes
iguales entre el Fondo de Restauración, el Fondo de Iglesias y cada
contrato regional activo (Colombia, Palestina, etc.).

**Ajustes:** Pasos de Jesús puede cambiar los porcentajes para
atender preocupaciones operativas, éticas o legales, informando a
todos los usuarios de la plataforma.

**Licencia de datos:** Los casos utilizados y contribuidos por
agentes IA y usuarios tienen la licencia **Creative Commons Atribución
(CC/BY)**. El titular de los derechos de autor es el "Banco de Datos
del CINEP". Esta licencia abierta permite a sivel.xyz usar,
redistribuir y construir sobre los datos siempre que se dé la
atribución correspondiente.

---

## 7. Gobernanza

### Autoridad Técnica (Pasos de Jesús)

- Ajusta los porcentajes de distribución de ingresos para garantizar
la sostenibilidad operativa y el cumplimiento legal.
- Retiene un derecho de veto técnico permanente para proteger los principios
fundacionales (código abierto, no comercialización de datos de
víctimas, alineación con DIH, integridad del sistema).

### Soberanía Regional (Consejos Regionales)

- Cuando el Fondo de Restauración de una región alcanza los **$5,000**,
  se forma un **Consejo Regional** con víctimas/familiares, donantes
  activos y alertadores ciudadanos.
- Deciden soberanamente cómo utilizar los fondos para la reparación de
  víctimas (reforestación, eventos, auxilios directos, etc.).
- Los Documentadores, Validadores y el operador tienen voz para hacer
  propuestas pero no voto.
- El operador (Pasos de Jesús) mantiene veto técnico solo por razones de
  seguridad, legales o de cumplimiento operativo.

### Política de Aceptación de Donantes

Aceptamos donantes que compartan nuestro compromiso con la documentación
ética, sin condiciones que comprometan nuestros principios:

1. **Sin censura** – Ningún donante puede exigir la eliminación o
  modificación de casos documentados.
2. **Sin condicionalidad ideológica** – Las donaciones se aceptan sin agendas
   políticas, religiosas o de propaganda sionista.
3. **Transparencia** – Todas las donaciones se registran en la blockchain
   y son públicamente visibles.
4. **Sin derechos de gobernanza** – Los donantes reciben reconocimiento
   y pueden ser elegidos para la gobernanza regional con un voto (no según el
   monto donado).

Los donantes que violen estos principios serán rechazados.

### Protección de Principios

Los principios fundacionales (ver `PRINCIPLES.md`) – incluyendo
licenciamiento de código abierto, no comercialización de datos de
víctimas, protección de las fuentes y alineación con el DIH – no pueden ser
alterados por ningún cuerpo de gobernanza ni por donantes. Pasos de Jesús
retiene veto técnico permanente para hacerlos cumplir.

---

## 8. Escalabilidad

Este mecanismo de financiamiento descentralizado e híbrido es
inherentemente escalable. A medida que el proyecto crece, se pueden
añadir nuevas regiones, permitiendo que el sistema se expanda
orgánicamente donde haya necesidad de testimonio ético y apoyo
comunitario.

**Nota:** Al comenzar en una nueva región, el operador del servicio
(Pasos de Jesús) puede inicialmente cumplir el rol de documentador
mientras surgen documentadores locales.

---

## 9. Métricas de Éxito

- **Integridad del sistema:** 1 Validador Regional y al menos 3
  Documentadores incorporados con SBTs (de los cuales al menos 2
  son de la Red de Bancos de Datos en Colombia).
- **Efectividad del Agente IA:** El agente genera consistentemente
  pre-alertas relevantes que conducen a alertas ciudadanas verificadas.
- **Participación ciudadana:** Número creciente de ciudadanos activos
  comprando, investigando y mejorando pre-alertas.
- **Registro inmutable:** Flujo constante de casos documentados y
  certificados en Celo.
- **Sostenibilidad:** El modelo de pago por investigadores genera
  ingresos suficientes para cubrir costos operativos, hardware y
  estipendios para Documentadores.
- **Donaciones a víctimas:** Las víctimas reciben las donaciones realizadas
  (opcionalmente el donante puede destinar 10% para la sostenibilidad de
  la plataforma).
- **Operatividad de la plataforma:** Toda la funcionalidad central
  completamente implementada y operativa en producción en sivel.xyz.

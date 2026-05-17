# Términos de Servicio — Tokens y Credenciales

Este documento establece las condiciones bajo las cuales una credencial
(SBT o NFT) emitida por `PasosDeJesusCredentials` puede ser revocada.

## Causas de revocación

La función `revokeCredential` será ejercida por `MINTER_ROLE` únicamente
cuando ocurra alguna de las siguientes situaciones:

1. **Contenido ilegal o contrario a la fe cristiana.** Aplica a NFTs
   personalizables. Incluye apología de violencia, pornografía, blasfemia,
   símbolos o mensajes contrarios al evangelio de Jesucristo.

2. **Violación de los términos de uso de la plataforma.** Cualquier
   acción que infrinja los términos publicados en `learn.tg`, `sivel.xyz`
   o `stable-sl.pdJ.app`.

3. **Suplantación de identidad o fraude.** Uso de credenciales para
   hacerse pasar por otra persona o entidad, o para obtener beneficios
   de forma fraudulenta.

4. **Solicitud de un verificador regional.** En el caso de SBTs de rol
   (Documenter, Validator), el verificador regional correspondiente
   puede solicitar la revocación por inactividad prolongada, mala conducta
   o pérdida de los requisitos del rol.

5. **Error administrativo.** Si se emitió una credencial por error
   (curso no completado, pago no recibido, rol incorrecto), el emisor
   puede revocarla para corregir el error.

## Procedimiento

1. El responsable del proyecto (`learn.tg`, `sivel.xyz` o `stable-sl`)
   evalúa si la situación califica según estos términos.
2. Un administrador con `MINTER_ROLE` ejecuta la transacción
   `revokeCredential(account, tokenId, amount)`.
3. Se documenta la revocación con el motivo en los registros del
   proyecto correspondiente.
4. El usuario afectado puede apelar contactando al equipo del proyecto.

## Limitaciones

- La revocación **no elimina** el historial on-chain. La transacción
  de revocación queda registrada permanentemente en la blockchain.
- La revocación no implica penalización económica ni confiscación de
  fondos, salvo lo que establezcan los términos específicos de cada
  proyecto.
- `PasosDeJesusCredentials` es un contrato sin custodia. La revocación
  solo puede quemar tokens, no acceder a fondos del usuario.

## Referencia

Este documento complementa los principios del proyecto establecidos en
[PRINCIPLES.md](../PRINCIPLES.md) y aplica a todos los sitios del ecosistema
Pasos de Jesús: `learn.tg`, `sivel.xyz` y `stable-sl.pdJ.app`.

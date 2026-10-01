// Registro de eventos de seguridad (checklist de producción). Sin
// presupuesto para un servicio de logging de terceros: Render ya captura la
// salida estándar del proceso de forma gratuita, así que un console.log con
// forma reconocible es, hoy, la opción de coste cero — se puede sustituir
// por algo más sofisticado (Sentry, Datadog...) el día que haga falta sin
// cambiar ninguna llamada a logSecurityEvent.
export type SecurityEvent =
  | "register"
  | "login_success"
  | "login_failed"
  | "account_locked"
  | "account_deleted"
  | "password_reset_requested"
  | "password_reset_completed";

export function logSecurityEvent(event: SecurityEvent, details: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      level: "security",
      event,
      at: new Date().toISOString(),
      ...details,
    })
  );
}

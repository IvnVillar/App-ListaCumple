// Inyectables para poder testear sin depender de un proveedor de email real
// (mismo patrón que MetadataExtractor y Suggester).
export type Mailer = (to: string, resetUrl: string) => Promise<void>;
// Devuelve true solo si el proveedor aceptó el envío: sin clave configurada o
// con un rechazo (p. ej. destinatario no permitido) devuelve false, para que
// quien necesite saberlo (el aviso masivo) no dé por enviado lo que no lo fue.
export type SendEmail = (to: string, subject: string, html: string) => Promise<boolean>;

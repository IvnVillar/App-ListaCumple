// Inyectables para poder testear sin depender de un proveedor de email real
// (mismo patrón que MetadataExtractor y Suggester).
export type Mailer = (to: string, resetUrl: string) => Promise<void>;
export type SendEmail = (to: string, subject: string, html: string) => Promise<void>;

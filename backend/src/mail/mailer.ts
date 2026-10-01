// Inyectable para poder testear la lógica de recuperación de contraseña sin
// depender de un proveedor de email real (mismo patrón que MetadataExtractor
// y Suggester).
export type Mailer = (to: string, resetUrl: string) => Promise<void>;

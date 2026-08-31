import { z } from "zod";

// Mismo formato que un "@usuario" de redes sociales: se comparte de palabra
// o de pantalla en pantalla sin exponer el email de nadie (a diferencia de
// buscar amigos por email, que obliga a conocer su dirección privada).
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "El usuario debe tener 3-20 caracteres: letras, números o guion bajo");

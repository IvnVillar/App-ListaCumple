import { createApp } from "./app";
import { createDb } from "./db";

async function main() {
  const db = await createDb();
  const app = createApp(db);

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(PORT, () => {
    console.log(`Backend escuchando en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("No se pudo arrancar el backend:", err);
  process.exit(1);
});

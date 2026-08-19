import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { setLogs, userSettings, users } from "../src/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { createRoutineFromTemplateForUser } from "../src/server/routines/mutations";
import { startSessionForUser } from "../src/server/workout/mutations";
import { getRoutineWithDetails } from "../src/server/db/routines";

/**
 * DoD de Fase 5 (CLAUDE.md §10): crear rutina → iniciar sesión de
 * entrenamiento → registrar 3 series → cortar la red → registrar 2 más →
 * restaurar red → verificar que todo llegó sin duplicados. La preparación
 * (usuario, rutina, sesión) se hace directo contra la lógica de negocio
 * real — mismo patrón que los tests de integración — para no acoplar el
 * E2E a la UI del constructor de rutinas, que ya tiene su propia cobertura
 * en Fase 3.
 */

const EMAIL = `e2e-offline-${Date.now()}@ironlog.test`;
const PASSWORD = "E2ePassword1234!";

let userId: string;
let sessionId: string;

test.beforeAll(async () => {
  const passwordHash = await hashPassword(PASSWORD);
  const [user] = await db
    .insert(users)
    .values({ email: EMAIL, name: "E2E Offline", passwordHash })
    .returning({ id: users.id });
  userId = user!.id;

  // Sin auto-inicio de descanso: el timer flotante no debe interferir con
  // los taps del test al completar series seguidas.
  await db.insert(userSettings).values({ userId, restAutoStart: false });

  const routineId = await createRoutineFromTemplateForUser(db, userId, "full-body-3");
  const routine = await getRoutineWithDetails(db, userId, routineId);
  const dayId = routine!.days[0]!.id;
  sessionId = await startSessionForUser(db, userId, dayId);
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

test("corte de red durante el Workout Player: 3 series online + 2 offline llegan sin duplicados", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/");

  await page.goto(`/entrenar/${sessionId}`);
  const completeButton = page.getByRole("button", { name: "Completar serie" });
  await expect(completeButton).toBeVisible();

  // 3 series con red normal — el primer ejercicio de la plantilla
  // full-body-3 (sentadillas) trae 4 series prescritas, alcanza sin
  // necesitar "+ Serie" todavía.
  for (let i = 0; i < 3; i++) {
    await completeButton.click();
    await expect(completeButton).toBeVisible();
  }

  const syncBadge = page.getByRole("status");

  await context.setOffline(true);
  await expect(syncBadge).toContainText("Sin conexión");

  // 2 series más, sin red — deben quedar en pantalla al toque (outbox local).
  await completeButton.click();
  await page.getByRole("button", { name: "+ Serie" }).click();
  await completeButton.click();
  await expect(syncBadge).toContainText("2 cambios pendientes");

  await context.setOffline(false);
  await expect(syncBadge).toBeHidden({ timeout: 15_000 });

  const rows = await db.select().from(setLogs).where(eq(setLogs.sessionId, sessionId));
  expect(rows).toHaveLength(5);
  expect(new Set(rows.map((r) => r.clientId)).size).toBe(5);
});

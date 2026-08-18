import { describe, expect, it } from "vitest";
import { htmlToInstructions } from "./html-to-instructions";

describe("htmlToInstructions", () => {
  it("extrae cada <li> como un paso, sin tags ni entidades", () => {
    const html =
      "<p>Intro</p><ol><li>Ponte de pie &amp; respira.</li><li>Baja &lt;controlado&gt;.</li></ol>";
    expect(htmlToInstructions(html)).toEqual([
      "Ponte de pie & respira.",
      "Baja <controlado>.",
    ]);
  });

  it("cae a párrafos cuando no hay <li>", () => {
    const html = "<p>Primer paso.</p><p>Segundo paso.</p>";
    expect(htmlToInstructions(html)).toEqual(["Primer paso.", "Segundo paso."]);
  });

  it("cae a texto plano cuando no hay ninguna estructura", () => {
    expect(htmlToInstructions("Sólo texto suelto")).toEqual(["Sólo texto suelto"]);
  });

  it("devuelve vacío para input vacío", () => {
    expect(htmlToInstructions("")).toEqual([]);
  });
});

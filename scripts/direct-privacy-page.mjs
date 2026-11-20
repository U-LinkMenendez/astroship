import { createHash } from "node:crypto";
import { lstatSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const page = new URL("../src/pages/aviso-de-privacidad.md", import.meta.url);
const marker = "generatedBy: ulink-direct-privacy\n";

function readGeneratedPage() {
  const info = lstatSync(page, { throwIfNoEntry: false });
  if (!info) return undefined;
  if (!info.isFile()) throw new Error("La ruta del aviso debe ser un archivo normal.");
  const previous = readFileSync(page, "utf8");
  if (!previous.startsWith("---\n" + marker)) {
    throw new Error("La ruta del aviso ya tiene un archivo de origen.");
  }
  return previous;
}

export default function directPrivacyPage() {
  let generated;
  return {
    name: "ulink-direct-privacy",
    hooks: {
      "astro:config:setup": ({ command }) => {
        if (command !== "build") return;
        const previous = readGeneratedPage();
        const input = process.env.CF_PAGES === "1" ? undefined : process.env.ULINK_DIRECT_PRIVACY_PREVIEW;
        if (input === undefined) {
          if (previous !== undefined) unlinkSync(page);
          return;
        }

        const source = input.replace(/\r\n?/g, "\n");
        const markdown = source.endsWith("\n") ? source : source + "\n";
        const title = markdown.match(/^# ([^\n]+)\n/)?.[1].trim();
        if (!title || markdown.length > 80000 || !/^## [^\n]+$/m.test(markdown)) {
          throw new Error("El aviso de Direct debe incluir un título y secciones en Markdown.");
        }
        const digest = createHash("sha256").update(markdown).digest("hex");
        generated = [
          "---",
          marker.trimEnd(),
          'layout: "../layouts/DirectPrivacyLayout.astro"',
          "title: " + JSON.stringify(title),
          "sourceSha256: " + digest,
          "---",
          "",
          markdown,
        ].join("\n");
        writeFileSync(page, generated, { encoding: "utf8", mode: 0o600 });
      },
      "astro:build:done": () => {
        if (generated !== undefined && readGeneratedPage() === generated) unlinkSync(page);
      },
    },
  };
}

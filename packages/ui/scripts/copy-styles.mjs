import { copyFile, cp } from "node:fs/promises";

await copyFile(
  new URL("../src/styles.css", import.meta.url),
  new URL("../dist/styles.css", import.meta.url),
);

await copyFile(
  new URL("../../../LICENSE", import.meta.url),
  new URL("../dist/LICENSE", import.meta.url),
);

await copyFile(
  new URL("../../../THIRD_PARTY_NOTICES.md", import.meta.url),
  new URL("../dist/THIRD_PARTY_NOTICES.md", import.meta.url),
);

await cp(
  new URL("../../../LICENSES/", import.meta.url),
  new URL("../dist/LICENSES/", import.meta.url),
  { recursive: true },
);

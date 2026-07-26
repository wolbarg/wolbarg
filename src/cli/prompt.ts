/**
 * Minimal interactive prompts (no third-party CLI deps).
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function withReadline<T>(
  fn: (rl: readline.Interface) => Promise<T>,
): Promise<T> {
  const rl = readline.createInterface({ input, output });
  try {
    return await fn(rl);
  } finally {
    rl.close();
  }
}

export async function askText(
  rl: readline.Interface,
  label: string,
  defaultValue?: string,
): Promise<string> {
  const hint =
    defaultValue !== undefined && defaultValue !== ""
      ? ` [${defaultValue}]`
      : "";
  const answer = (await rl.question(`${label}${hint}: `)).trim();
  if (answer === "") return defaultValue ?? "";
  return answer;
}

/**
 * Optional text field — empty Enter keeps default; typing "-" clears (leaves empty).
 */
export async function askOptionalText(
  rl: readline.Interface,
  label: string,
  defaultValue?: string,
): Promise<string | undefined> {
  const hintParts: string[] = [];
  if (defaultValue !== undefined && defaultValue !== "") {
    hintParts.push(`default: ${defaultValue}`);
  }
  hintParts.push("Enter to accept", '"-" to skip/clear');
  const answer = (
    await rl.question(`${label} (${hintParts.join(", ")}): `)
  ).trim();
  if (answer === "-") return undefined;
  if (answer === "") {
    return defaultValue === "" ? undefined : defaultValue;
  }
  return answer;
}

export async function askSelect<T extends string>(
  rl: readline.Interface,
  label: string,
  choices: Array<{ value: T; label: string }>,
  defaultValue?: T,
  allowSkip = true,
): Promise<T | undefined> {
  console.log(`\n${label}`);
  choices.forEach((c, i) => {
    const mark = c.value === defaultValue ? " (default)" : "";
    console.log(`  ${i + 1}) ${c.label}${mark}`);
  });
  if (allowSkip) {
    console.log(`  0) Skip`);
  }
  const defIndex =
    defaultValue != null
      ? choices.findIndex((c) => c.value === defaultValue) + 1
      : allowSkip
        ? 0
        : 1;
  const raw = (
    await rl.question(
      `Choose [0-${choices.length}]${defIndex >= 0 ? ` (default ${defIndex})` : ""}: `,
    )
  ).trim();

  if (raw === "" && defIndex === 0 && allowSkip) return undefined;
  if (raw === "" && defIndex > 0) return choices[defIndex - 1]!.value;
  if (raw === "0" && allowSkip) return undefined;

  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > choices.length) {
    console.log("Invalid choice — skipped.");
    return allowSkip ? undefined : defaultValue;
  }
  return choices[n - 1]!.value;
}

export async function askConfirm(
  rl: readline.Interface,
  label: string,
  defaultYes = true,
): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} (${hint}): `)).trim().toLowerCase();
  if (answer === "") return defaultYes;
  if (answer === "y" || answer === "yes") return true;
  if (answer === "n" || answer === "no") return false;
  return defaultYes;
}

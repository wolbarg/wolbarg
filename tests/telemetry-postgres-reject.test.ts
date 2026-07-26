/**
 * Telemetry config honesty: Postgres is typed but not implemented.
 * Must fail closed — never silently open a SQLite file instead.
 */
import { describe, expect, it } from "vitest";
import {
  ConfigurationError,
  Wolbarg,
  createTelemetryProvider,
  openaiEmbedding,
} from "../src/index.js";
import { validateTelemetryConfig } from "../src/core/validate.js";

describe("telemetry postgres fail-closed", () => {
  it("validateTelemetryConfig rejects provider postgres", () => {
    expect(() =>
      validateTelemetryConfig({
        database: {
          provider: "postgres",
          url: "postgresql://localhost/telemetry",
        },
      }),
    ).toThrow(ConfigurationError);
  });

  it("createTelemetryProvider rejects provider postgres", () => {
    expect(() =>
      createTelemetryProvider({
        database: {
          provider: "postgres",
          url: "postgresql://localhost/telemetry",
        },
      }),
    ).toThrow(/PostgreSQL telemetry is not implemented/i);
  });

  it("Wolbarg constructor rejects postgres telemetry config", () => {
    expect(
      () =>
        new Wolbarg({
          organization: "tel-pg",
          database: { provider: "sqlite", url: ":memory:" },
          embedding: openaiEmbedding({
            baseUrl: "https://embed.test/v1",
            apiKey: "test",
            model: "test-embed",
          }),
          telemetry: {
            database: {
              provider: "postgres",
              url: "postgresql://localhost/telemetry",
            },
          },
        }),
    ).toThrow(ConfigurationError);
  });
});

/**
 * Postgres SSL production defaults.
 */
import { describe, expect, it } from "vitest";
import {
  applyPostgresSslPolicy,
  hasExplicitSslSetting,
  isPostgresLoopbackHost,
  remoteInsecureSslWarning,
} from "../src/storage/postgres/ssl.js";

describe("postgres SSL policy", () => {
  it("leaves loopback hosts without sslmode alone", () => {
    const local = "postgresql://wolbarg:wolbarg@localhost:5432/wolbarg_test";
    expect(isPostgresLoopbackHost(local)).toBe(true);
    expect(applyPostgresSslPolicy(local)).toBe(local);
    expect(applyPostgresSslPolicy(local, undefined)).not.toContain("sslmode");
  });

  it("requires SSL for remote hosts without explicit sslmode", () => {
    const remote =
      "postgresql://user:pass@db.example.com:5432/prod?connect_timeout=10";
    expect(isPostgresLoopbackHost(remote)).toBe(false);
    const applied = applyPostgresSslPolicy(remote);
    expect(applied).toMatch(/sslmode=require/);
    expect(hasExplicitSslSetting(applied)).toBe(true);
  });

  it("respects existing sslmode", () => {
    const url =
      "postgresql://user:pass@db.example.com:5432/prod?sslmode=verify-full";
    expect(applyPostgresSslPolicy(url)).toBe(url);
  });

  it("allows explicit disable and warns for remote", () => {
    const remote = "postgresql://user:pass@db.example.com:5432/prod";
    const disabled = applyPostgresSslPolicy(remote, false);
    expect(disabled).toMatch(/sslmode=disable/);
    expect(remoteInsecureSslWarning(remote, false)).toMatch(/plaintext/i);
    expect(
      remoteInsecureSslWarning(
        "postgresql://localhost:5432/db",
        false,
      ),
    ).toBeNull();
  });

  it("forces require when ssl: true", () => {
    const local = "postgresql://localhost:5432/db";
    expect(applyPostgresSslPolicy(local, true)).toMatch(/sslmode=require/);
  });
});

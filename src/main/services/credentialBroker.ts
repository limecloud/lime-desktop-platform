import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ModelProviderCredentialState, ModelProviderConfig } from '../../shared/types';

interface EncryptedCredentialRecord {
  version: 1;
  providerId: string;
  authType: 'api-key' | 'oauth';
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
  expiresAt?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readJson<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function writeJson<T>(filePath: string, value: T): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function validateProviderId(providerId: string): string {
  const normalized = providerId.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(normalized) || normalized.includes('..')) {
    throw new Error('Credential providerId 必须是 1-128 位字母、数字、点、下划线或短横线，并且不能包含连续点。');
  }
  return normalized;
}

export class CredentialBroker {
  constructor(private readonly rootDir: string) {}

  hasModelProviderCredential(providerId: string): boolean {
    return existsSync(this.getCredentialPath(providerId));
  }

  readModelProviderCredentialState(input: {
    providerId: string;
    authType: Exclude<NonNullable<ModelProviderConfig['authType']>, 'none'>;
  }): ModelProviderCredentialState {
    const record = readJson<EncryptedCredentialRecord>(this.getCredentialPath(input.providerId));
    const configured = Boolean(record && record.authType === input.authType && record.algorithm === 'aes-256-gcm');
    const rotationRequired = configured ? isCredentialRotationRequired(record?.expiresAt) : false;
    return {
      providerId: validateProviderId(input.providerId),
      authType: input.authType,
      configured,
      storageKind: configured ? 'local-encrypted-file' : 'none',
      keychainBacked: false,
      updatedAt: configured ? record?.updatedAt : undefined,
      expiresAt: configured ? record?.expiresAt : undefined,
      rotationRequired,
      runtimeStatus: configured ? (rotationRequired ? 'rotation-required' : 'broker-reference-only') : 'missing',
      plaintextSecrets: false,
    };
  }

  writeModelProviderCredential(input: {
    providerId: string;
    authType: 'api-key' | 'oauth';
    value: string;
    expiresAt?: string;
  }): void {
    const value = input.value.trim();
    if (!value) {
      return;
    }

    const key = this.readOrCreateKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const record: EncryptedCredentialRecord = {
      version: 1,
      providerId: validateProviderId(input.providerId),
      authType: input.authType,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      updatedAt: nowIso(),
      expiresAt: input.expiresAt,
    };
    writeJson(this.getCredentialPath(input.providerId), record);
  }

  resolveModelProviderCredential(input: { providerId: string; authType: 'api-key' | 'oauth' }): string | undefined {
    const record = readJson<EncryptedCredentialRecord>(this.getCredentialPath(input.providerId));
    if (!record || record.authType !== input.authType || record.algorithm !== 'aes-256-gcm') {
      return undefined;
    }

    const decipher = createDecipheriv('aes-256-gcm', this.readOrCreateKey(), Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  deleteModelProviderCredential(providerId: string): boolean {
    const credentialPath = this.getCredentialPath(providerId);
    if (!existsSync(credentialPath)) {
      return false;
    }
    rmSync(credentialPath, { force: true });
    return true;
  }

  private readOrCreateKey(): Buffer {
    const keyPath = join(this.rootDir, 'broker-key.bin');
    if (existsSync(keyPath)) {
      const key = readFileSync(keyPath);
      if (key.length === 32) {
        return key;
      }
    }

    const key = randomBytes(32);
    mkdirSync(this.rootDir, { recursive: true });
    writeFileSync(keyPath, key);
    return key;
  }

  private getCredentialPath(providerId: string): string {
    return join(this.rootDir, 'model-providers', `${validateProviderId(providerId)}.json`);
  }
}

function isCredentialRotationRequired(expiresAt: string | undefined): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  return Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now();
}

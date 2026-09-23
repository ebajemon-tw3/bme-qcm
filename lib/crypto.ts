// Chiffrement du bundle : PBKDF2-SHA256 puis AES-256-GCM, Web Crypto uniquement.
// Le même code tourne dans le navigateur et dans les scripts Bun.
//
// Format du fichier data.enc :
//   octets 0..3    "BMQ1"
//   octets 4..7    nombre d'itérations PBKDF2, entier non signé big-endian
//   octets 8..23   sel, 16 octets aléatoires
//   octets 24..35  IV AES-GCM, 12 octets aléatoires
//   octets 36..    texte chiffré suivi du tag GCM de 16 octets
// L'en-tête entier est authentifié comme donnée additionnelle GCM.

export const PBKDF2_ITERATIONS = 600_000;

const MAGIC = new TextEncoder().encode("BMQ1");
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const HEADER_LENGTH = MAGIC.length + 4 + SALT_LENGTH + IV_LENGTH;

export class WrongPasswordError extends Error {
  constructor() {
    super("Mot de passe incorrect.");
    this.name = "WrongPasswordError";
  }
}

export class InvalidBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBundleError";
  }
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBundle(plain: Uint8Array<ArrayBuffer>, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC, 0);
  new DataView(header.buffer).setUint32(MAGIC.length, PBKDF2_ITERATIONS);
  header.set(salt, MAGIC.length + 4);
  header.set(iv, MAGIC.length + 4 + SALT_LENGTH);

  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: header }, key, plain),
  );

  const out = new Uint8Array(HEADER_LENGTH + sealed.length);
  out.set(header, 0);
  out.set(sealed, HEADER_LENGTH);
  return out;
}

export async function decryptBundle(file: Uint8Array<ArrayBuffer>, password: string) {
  if (file.length <= HEADER_LENGTH + 16) throw new InvalidBundleError("Fichier de données tronqué.");
  const header = file.slice(0, HEADER_LENGTH);
  if (!MAGIC.every((byte, i) => header[i] === byte)) {
    throw new InvalidBundleError("Fichier de données dans un format inconnu.");
  }
  const iterations = new DataView(header.buffer).getUint32(MAGIC.length);
  if (iterations < PBKDF2_ITERATIONS) {
    throw new InvalidBundleError("Fichier de données chiffré avec un paramétrage trop faible.");
  }
  const salt = header.slice(MAGIC.length + 4, MAGIC.length + 4 + SALT_LENGTH);
  const iv = header.slice(MAGIC.length + 4 + SALT_LENGTH, HEADER_LENGTH);

  const key = await deriveKey(password, salt, iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: header },
      key,
      file.slice(HEADER_LENGTH),
    );
    return new Uint8Array(plain);
  } catch {
    // GCM ne distingue pas un mauvais mot de passe d'un fichier altéré : un seul message.
    throw new WrongPasswordError();
  }
}

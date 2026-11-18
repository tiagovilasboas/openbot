import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { Readable } from "node:stream";
import { isPublicAddress } from "./public-address.ts";

export type AddressResolver = (hostname: string) => Promise<string[]>;

export type PinnedFetchOptions = {
  /** Name resolution; defaults to the system resolver. */
  resolve?: AddressResolver;
  /** Which resolved addresses may be connected to; defaults to public ones. */
  isAllowed?: (address: string) => boolean;
};

type LookupCallback = (
  error: Error | null,
  address: string | { address: string; family: number }[],
  family?: number,
) => void;

const NO_BODY_STATUSES = new Set([101, 204, 205, 304]);

async function resolveSystem(hostname: string): Promise<string[]> {
  const found = await dnsLookup(hostname, { all: true, verbatim: true });
  return found.map((entry) => entry.address);
}

/**
 * Socket-level lookup that resolves the name once, refuses the whole host if
 * any answer is not allowed, and hands the socket only validated addresses.
 * The connection therefore goes to exactly what was checked, so a DNS answer
 * that changes later cannot reach a private address.
 */
function validatingLookup(
  resolve: AddressResolver,
  isAllowed: (address: string) => boolean,
) {
  return (
    hostname: string,
    options: { all?: boolean } | number,
    callback: LookupCallback,
  ) => {
    const wantsAll = typeof options === "object" && options.all === true;
    resolve(hostname).then(
      (addresses) => {
        if (addresses.length === 0 || !addresses.every(isAllowed)) {
          callback(new Error("blocked_address"), []);
          return;
        }
        const entries = addresses.map((address) => ({
          address,
          family: address.includes(":") ? 6 : 4,
        }));
        if (wantsAll) callback(null, entries);
        else callback(null, entries[0].address, entries[0].family);
      },
      (error: unknown) =>
        callback(error instanceof Error ? error : new Error("dns_failed"), []),
    );
  };
}

/**
 * A GET-only fetch over node:http(s) that connects only to addresses the
 * validating lookup approved. The URL keeps its original hostname, so the Host
 * header and the TLS server name (SNI and certificate check) stay correct.
 * Redirects are never followed; the caller handles them.
 */
export function createPinnedFetch(
  options: PinnedFetchOptions = {},
): typeof fetch {
  const lookup = validatingLookup(
    options.resolve ?? resolveSystem,
    options.isAllowed ?? isPublicAddress,
  );

  return ((input: string | URL, init: RequestInit = {}) =>
    new Promise<Response>((resolve, reject) => {
      const url = new URL(String(input));
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const request = send(
        url,
        {
          method: "GET",
          headers: init.headers as Record<string, string> | undefined,
          signal: init.signal ?? undefined,
          lookup,
          // A pooled keep-alive socket is keyed by host and port, not by the
          // validated lookup: every request opens its own pinned socket.
          agent: false,
        },
        (res) => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) {
              for (const item of value) headers.append(name, item);
            } else if (value !== undefined) headers.set(name, value);
          }
          const status = res.statusCode ?? 502;
          if (NO_BODY_STATUSES.has(status)) {
            res.resume();
            resolve(new Response(null, { status, headers }));
            return;
          }
          resolve(
            new Response(Readable.toWeb(res) as ReadableStream, {
              status,
              headers,
            }),
          );
        },
      );
      request.on("error", reject);
      request.end();
    })) as typeof fetch;
}

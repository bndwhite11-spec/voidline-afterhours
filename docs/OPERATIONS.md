# Private unattended operations

`worker/operations.mjs` exposes a narrow Site-hosted MCP server. It has no tool
for reading conversation content, credential records, encryption keys or raw
database exports. It is separate from the native platform-owner dashboard.

## Trust and setup

The supported Sites MCP dispatcher authenticates the connected caller, checks
Site access and supplies `oai-authenticated-user-id`, a Site-scoped identity.
The additional operator restriction compares that identity with server runtime
`VOIDLINE_SERVICE_OAI_ID`. Ordinary Site viewer access, a native username,
`@xrp`, a request argument or a native community role never grants this role.

This header is trusted only at the hosted `/mcp` boundary. Before enabling an
operator, verify that a direct unauthenticated request with a forged caller
header is rejected or its identity is stripped/replaced by the Sites dispatcher.
Local header-contract tests do not prove the edge behavior. Do not expose the
Worker directly through a separate origin that bypasses that dispatcher.

The integration follows the installed [Sites MCP documentation](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/references/site-mcp-server.md),
which states: “Sites authenticates MCP requests and checks that the caller can
view the Site before forwarding them to your server.” It documents the injected
Site-scoped identity. Infrastructure must preserve that authenticated boundary.

1. Publish the existing Site with the `mcp` capability. Sites provisions its
   private owner plugin. Use the returned plugin/connection identifiers exactly.
2. Install/connect that plugin if it was not connected automatically. Call
   `operation_identity` through the real connection. It returns only the
   authenticated caller ID and explicitly grants no access.
3. A trusted Site infrastructure administrator binds that verified caller ID as
   `VOIDLINE_SERVICE_OAI_ID` in runtime configuration. This is not first-caller
   ownership and does not bind the native platform owner.
4. For encrypted D1 snapshots, generate a random 32-byte AES key and install its
   standard-base64 value as secret `VOIDLINE_BACKUP_KEY`. Preserve an independent
   protected copy outside the application. Never put it in Git, downloads,
   task prompts, logs, public profiles or browser storage.
5. Deploy the existing reviewed version with the new runtime revision, then
   call `operation_status` and `process_queues` through the intended connection.
   Verify actual results before describing unattended operation as working.

## Tools and bounds

| Tool | Behavior |
|---|---|
| `operation_identity` | Reports only the authenticated caller's Site-scoped ID. |
| `operation_status` | Returns content-free configuration, queue counts, Matrix policy health and protected backup receipts. |
| `process_queues` | Processes bounded native push retries, at most 12 media cleanup records and at most 8 Matrix policy operations. |
| `create_protected_backup` | Stores a bounded AES-GCM D1 logical snapshot in private R2 and returns only its receipt. Media file bytes are separate. |

No tool accepts a target account, arbitrary URL, query, SQL, page size, secret or
operator override. Native authenticated mutation traffic still schedules a small
cleanup/policy batch as a supplementary path. That does not replace a scheduler.

Native push retains its source/session/access checks, generic payloads, delivery
leases, retry limits, quiet hours and suppression. Provider acceptance does not
establish browser receipt. Matrix lifecycle work operates only verified managed
account/device mappings and requires an independently configured compatible
Synapse admin service; missing configuration leaves pending work truthful.

## Link and verify schedules

The owner requested independently scheduled delivery and backups. Read the
Site's existing linked automations before creating any task; never duplicate an
existing or paused task silently. A suitable initial cadence is a queue run
every 15minutes and one daily protected snapshot, in `Asia/Yerevan`.

Use linked Sites cloud schedules with the connected Site plugin. Prompts should
identify only the narrow writer and expected content-free readback. They must
contain no credentials. A scheduled task's authorization must work independently
of a browser login or this conversation's transient credentials.

If the plugin is not connected or an unattended run cannot be verified, leave
the scheduler state incomplete. A saved task is not evidence of execution.
Record the actual linked schedule ID, first-run result and readback in the
release report only after they exist. The source intentionally does not hardcode
an invented task ID, operator ID, Matrix service or backup success.

For restore/retention, see `BACKUP-RESTORE.md`. The native Sites connector does
not provide a supported live-D1 restore API. Isolated restore tests and an
encrypted snapshot receipt do not establish a production restoration drill.

# Security Specification - Name Registry

## 1. Data Invariants
- Each document in `/names/{nameId}` must represent a valid name log.
- Only authenticated users with verified emails (required by the skill rules where emails are present and unless specified otherwise, or standard authentication) can create entries.
- The `userId` stored in the document must match the authenticated user's UID.
- The `userEmail` stored in the document must match the authenticated user's email.
- The `name` must be a string of length between 1 and 100 characters.
- The `createdAt` field must be equal to the server's request timestamp (`request.time`).
- Documents are immutable after creation. No updates or deletes are permitted by clients.

## 2. The "Dirty Dozen" Spoofing and Integrity Attack Payloads

### Payload 1: Unauthenticated Create
- **Attack Vector**: Attacker attempts to write a name log without logging in.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Spoofed Creator UID
- **Attack Vector**: Authenticated User A tries to create a log setting `userId` to User B's UID.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Spoofed Creator Email
- **Attack Vector**: Authenticated User A tries to create a log with User B's email.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Spoofed Timestamp
- **Attack Vector**: Authenticated User tries to backdate or postdate `createdAt` instead of using the server timestamp.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Empty Name
- **Attack Vector**: Attempting to write an empty name string.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Oversized Name
- **Attack Vector**: Attempting to write a name string longer than 100 characters to drain resources.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Invalid Name ID format (ID Poisoning)
- **Attack Vector**: Attempting to push entries with custom malicious document IDs (like `../malicious/path` or junk characters of 1.5KB).
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Client-Side Update Attempt
- **Attack Vector**: Attempting to edit an existing log's name after it is created.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Client-Side Delete Attempt
- **Attack Vector**: Attempting to delete an existing log to erase trace or history.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Non-string Type Injection for Name
- **Attack Vector**: Attempting to submit a boolean or array instead of a string for the `name` field.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Extra Ghost Fields
- **Attack Vector**: Attempting to inject excess malicious fields into the document schema (e.g., `isVerified: true`).
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: List query delegation without UID filter
- **Attack Vector**: An unauthenticated user attempts to query the list of names.
- **Expected Outcome**: `PERMISSION_DENIED`

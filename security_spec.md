# Firebase Security Specification - SafeShelf AI

## 1. Data Invariants
- A **Medicine** record must belong to a valid authenticated user.
- The `userId` in the document must match the creator's `uid`.
- `createdAt` must be set to the server timestamp and remain immutable.
- `expiryDate` must be a valid timestamp.
- Document IDs must follow a standard alphanumeric format.

## 2. The "Dirty Dozen" Payloads (Denial Expected)

1. **Identity Spoofing**: Attempt to create a medicine with another user's `userId`.
2. **Shadow Field Injection**: Adding `isAdmin: true` to a medicine document.
3. **Immutability Breach**: Attempting to change `createdAt` during an update.
4. **ID Poisoning**: Using a 2KB string as a document ID.
5. **Type Poisoning**: Sending `quantity: "lots"` (string instead of number).
6. **Status Escalation**: Setting `status` to an undefined value like `"super-active"`.
7. **Cross-User Leak**: Authenticated User A attempting to `list` User B's medicines.
8. **Malicious Date**: Setting `expiryDate` to a random string instead of a timestamp.
9. **Update Gap**: Attempting to update the `userId` field to "transfer" ownership.
10. **State Shortcutting**: Updating `updatedAt` to a past date.
11. **Resource Exhaustion**: Sending a 1MB string for the medicine `name`.
12. **Unauthenticated Write**: Anonymously attempting to create a record.

## 3. Conflict Report

| Requirement | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| **Medicines** | Blocked by `data.userId == request.auth.uid` | Blocked by `updatedAt == request.time` | Blocked by `.size() <= 200` |

## 4. Test Runner Plan
The `firestore.rules.test.ts` will verify these scenarios using the Firebase Rules Unit Testing library.

# SpendWise Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership**: Every document in `users`, `categories`, `transactions`, `budgets`, and `exchangeRates` belongs to exactly one authenticated `request.auth.uid`.
2. **PII Isolation**: User profile records (`users/{userId}`) allow `get` only when `request.auth.uid == userId`; `list` on `users` is strictly denied (`false`).
3. **Referential Integrity**: Every `transaction` and `budget` must reference an existing `categoryId` in `categories` owned by the same `request.auth.uid` whose `type` matches the transaction type (or `'expense'` for budgets).
4. **Immutable Ownership & Creation Timestamps**: `userId`, `id`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
5. **Financial Value Bounds**: Monetary amounts (`amount`, `rate`) must be strictly positive numbers within safe bounds (`> 0` and `<= 1_000_000_000_000`), and currencies are restricted to supported ISO codes (`NGN`, `USD`, `GBP`).
6. **Zero Shadow Fields**: Every create checks `hasAll` + `hasOnly`, and every update enforces `affectedKeys().hasOnly(...)` alongside full entity schema validation.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Identity Spoofing on Transaction Create**: User A attempts to create `transactions/tx1` with `userId: "user_b"`.
2. **Ownership Hijack on Transaction Update**: User A updates `transactions/tx_owned_by_b` or changes `userId` on their own transaction to `"user_b"`.
3. **Shadow Field Injection on User Create**: User A creates `users/userA` including an unexpected field `isAdmin: true`.
4. **Cross-User PII Enumeration**: User A runs a `list` query on `/users` or `get` on `/users/user_b`.
5. **Client-Delegated List Scrape**: User A executes an unfiltered `list` query on `/transactions` without `where('userId', '==', 'userA')`.
6. **Negative or Zero Amount**: User A creates a transaction with `amount: -500` or `amount: 0`.
7. **Unsupported Currency Injection**: User A creates a transaction with `currency: "BTC"`.
8. **Orphan / Cross-User Category Reference**: User A creates a transaction referencing `categoryId: "cat_owned_by_b"` or `"nonexistent_cat"`.
9. **Type Mismatch on Category Assignment**: User A creates an `expense` transaction referencing an `income` category.
10. **Immutable Field Mutation**: User A updates `transactions/tx1` attempting to alter `createdAt` or `id`.
11. **Timestamp Forgery**: User A creates a transaction with a backdated client `createdAt` instead of `serverTimestamp()`.
12. **Path ID Poisoning**: User A writes to `/transactions/invalid$id*with!badchars` or a >128-character document ID.

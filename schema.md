# SpaceRemind — Firestore Data Schema

This document describes the proposed Cloud Firestore data model and the
Firebase Storage layout for SpaceRemind. It maps directly to the user flow:
**Location → Place → Items**, with a QR/NFC tag pointing at a Place.

> Status: **proposal — pending review.** Nothing below is wired into UI yet.

---

## Hierarchy at a glance

```
Location (e.g. "Kitchen")
  └── Place (e.g. "Under Sink Cabinet")   ← QR code / NFC tag points here
        └── Item (e.g. "Dish soap", with photo)
```

A **Location** is the broad area. A **Place** is a specific storage spot
within it and is the unit that gets a printable QR code / writable NFC tag.
**Items** are the cataloged contents of a Place.

---

## Collections

The schema uses **top-level collections** with reference fields (rather than
deep subcollections) so a Place can be fetched directly by its document ID
when a QR code is scanned — `/?place=<placeId>` resolves to one `getDoc`.

### `locations/{locationId}`

| Field       | Type        | Notes                              |
| ----------- | ----------- | ---------------------------------- |
| `name`      | string      | e.g. "Kitchen", "Garage"           |
| `createdAt` | timestamp   | `serverTimestamp()` on create      |

### `places/{placeId}`

| Field        | Type      | Notes                                              |
| ------------ | --------- | -------------------------------------------------- |
| `locationId` | string    | Reference to the parent `locations` document       |
| `name`       | string    | e.g. "Under Sink Cabinet"                          |
| `createdAt`  | timestamp | `serverTimestamp()` on create                      |

The `placeId` is what the QR code / NFC tag encodes (via the deep link
`https://<host>/?place=<placeId>`).

### `items/{itemId}`

| Field       | Type           | Notes                                          |
| ----------- | -------------- | ---------------------------------------------- |
| `placeId`   | string         | Reference to the parent `places` document      |
| `name`      | string         | Item name, e.g. "Dish soap"                    |
| `photoUrl`  | string \| null | Download URL from Firebase Storage             |
| `photoPath` | string \| null | Storage path, kept so the file can be deleted  |
| `createdAt` | timestamp      | `serverTimestamp()` on create                  |

---

## Firebase Storage layout

Item photos are stored per-Place so cleanup is straightforward:

```
places/{placeId}/{timestamp}-{filename}
```

The resulting download URL is saved to `items.photoUrl` and the path to
`items.photoPath`.

---

## Common queries

| Goal                                | Query                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| All locations                       | `locations` ordered by `name`                                |
| Places in a location                | `places where locationId == X` ordered by `name`             |
| Open a scanned Place                | `getDoc(places/{placeId})`                                   |
| Inventory of a Place                | `items where placeId == X` ordered by `createdAt` desc       |

> Note: the filtered + ordered queries above require composite indexes in
> Firestore. Firebase will surface a one-click link to create them the first
> time each query runs.

---

## Suggested security rules (starting point)

Authentication is **not** part of the initial scaffold. Before going to
production, scope reads/writes to the signed-in owner. A rough shape:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      // TODO: replace with auth-based ownership checks
      allow read, write: if true; // dev only — DO NOT ship
    }
  }
}
```

---

## Open questions for review

1. **Auth & ownership** — single-user, or multi-user with `ownerId` on every
   doc? This affects security rules and every query.
2. **Soft vs. hard delete** — should deleting a Place cascade-delete its Items
   and photos, or archive them?
3. **Multiple photos per item** — current model is one `photoUrl` per item.
   Should items support a gallery (`photoUrls: string[]`)?
4. **Reminders** — the product name implies reminders. Do we need a
   `reminders` collection (item/place + due date) in this schema?

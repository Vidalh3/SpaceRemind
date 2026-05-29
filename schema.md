# SpaceRemind — Firestore Data Schema

This document describes the Cloud Firestore data model and the Firebase
Storage layout for SpaceRemind. It maps to the user flow:
**Location → Place → Items**, with a QR/NFC tag pointing at a Place.

> Status: **approved** — multi-user, cascade delete, photo galleries, and
> reminders. Data layer (`src/api`) matches this; UI screens come next.

---

## Hierarchy at a glance

```
User (Firebase Auth)
  └── Location (e.g. "Kitchen")
        └── Place (e.g. "Under Sink Cabinet")   ← QR code / NFC tag points here
              └── Item (e.g. "Dish soap", with a gallery of photos)

Reminders reference an Item or Place and have a due date.
```

A **Location** is the broad area. A **Place** is a specific storage spot
within it and is the unit that gets a printable QR code / writable NFC tag.
**Items** are the cataloged contents of a Place. **Reminders** are
time-based nudges attached to an Item or Place.

---

## Multi-user model

The app is **multi-user**. Every document carries an `ownerId` equal to the
creating user's Firebase Auth UID. All reads/writes are scoped to
`ownerId == request.auth.uid` (see security rules below), so each user only
ever sees their own data — including when a Place is opened via a scanned QR
code.

---

## Collections

Top-level collections with reference fields (rather than deep subcollections)
so a Place can be fetched directly by its document ID when a QR code is
scanned — `/?place=<placeId>` resolves to one `getDoc`.

### `locations/{locationId}`

| Field       | Type      | Notes                            |
| ----------- | --------- | -------------------------------- |
| `ownerId`   | string    | Firebase Auth UID of the owner   |
| `name`      | string    | e.g. "Kitchen", "Garage"         |
| `createdAt` | timestamp | `serverTimestamp()` on create    |

### `places/{placeId}`

| Field        | Type      | Notes                                        |
| ------------ | --------- | -------------------------------------------- |
| `ownerId`    | string    | Firebase Auth UID of the owner               |
| `locationId` | string    | Reference to the parent `locations` document |
| `name`       | string    | e.g. "Under Sink Cabinet"                    |
| `createdAt`  | timestamp | `serverTimestamp()` on create                |

The `placeId` is what the QR code / NFC tag encodes (via the deep link
`https://<host>/?place=<placeId>`).

### `items/{itemId}`

| Field       | Type      | Notes                                                  |
| ----------- | --------- | ------------------------------------------------------ |
| `ownerId`   | string    | Firebase Auth UID of the owner                         |
| `placeId`   | string    | Reference to the parent `places` document              |
| `name`      | string    | Item name, e.g. "Dish soap"                            |
| `photos`    | array     | **Gallery** — array of `{ url, path }` (see Storage)   |
| `createdAt` | timestamp | `serverTimestamp()` on create                          |

`photos` is an ordered array of objects: `url` is the Storage download URL
(used in `<img>`), `path` is the Storage path (kept so each photo can be
deleted individually). An item with no photos has `photos: []`.

### `reminders/{reminderId}`

| Field        | Type           | Notes                                              |
| ------------ | -------------- | -------------------------------------------------- |
| `ownerId`    | string         | Firebase Auth UID of the owner                     |
| `targetType` | string         | `"item"` or `"place"`                              |
| `targetId`   | string         | ID of the referenced Item or Place                 |
| `title`      | string         | What to be reminded about                          |
| `dueAt`      | timestamp      | When the reminder fires                            |
| `done`       | boolean        | Whether it has been completed/dismissed            |
| `createdAt`  | timestamp      | `serverTimestamp()` on create                      |

---

## Firebase Storage layout

Item photos are stored per-Place so cleanup is straightforward:

```
places/{placeId}/{timestamp}-{filename}
```

Each uploaded photo contributes a `{ url, path }` entry to the item's
`photos` array.

---

## Cascade delete

Deleting is a **hard cascade** (confirmed):

- **Delete a Place** → delete all its `items`, delete every photo in each
  item's `photos` array from Storage, delete any `reminders` targeting the
  Place or its items, then delete the Place.
- **Delete an Item** → delete its photos from Storage and any `reminders`
  targeting it, then delete the Item.

Cascades run client-side in the data layer for now (`deletePlaceCascade`,
`deleteItemCascade`). If this grows expensive or needs to be atomic, move it
to a Cloud Function triggered on delete.

---

## Common queries

| Goal                                | Query                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- |
| My locations                        | `locations where ownerId == uid` ordered by `name`                     |
| Places in a location                | `places where ownerId == uid && locationId == X` ordered by `name`     |
| Open a scanned Place                | `getDoc(places/{placeId})` (then verify `ownerId == uid`)              |
| Inventory of a Place                | `items where ownerId == uid && placeId == X` ordered by `createdAt`    |
| Upcoming reminders                  | `reminders where ownerId == uid && done == false` ordered by `dueAt`   |

> Note: the multi-field filtered + ordered queries require composite indexes.
> Firebase surfaces a one-click link to create each one the first time it runs.

---

## Security rules (multi-user)

Requires Firebase Auth. Every document is owned by the user who created it;
reads and writes are restricted to that owner.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function owns(resource) { return resource.data.ownerId == request.auth.uid; }

    match /{collection}/{docId} {
      allow read: if signedIn() && owns(resource);
      allow create: if signedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if signedIn() && owns(resource);
    }
  }
}
```

Storage rules should likewise restrict `places/{placeId}/**` to authenticated
users (ideally validated against Place ownership).

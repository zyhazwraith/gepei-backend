# Release Notes

## v1.1.1

- Merge previous MR: `feat/ui-order-guide-improvements` (`30c4dfe` / feature commit `7d41f93`).
- Improve order/guide UI flow and detail UX:
  - `OrderCreate`: improve guide loading and parameter compatibility (`guideId` / `guide_id`).
  - `OrderDetail`: optimize page rendering and interaction details.
  - `GuideDetail`: polish detail display and interaction behavior.
- Fix guide list infinite scroll pagination trigger on `/guides`.
- Add next-page auto load with `IntersectionObserver`.

## v1.1.0

- Minor release.
- Guide photo slot contract is now strict: `guide_photo.slot` must be `0..4`.
- Backend and frontend now follow the same `0`-based indexing pattern.

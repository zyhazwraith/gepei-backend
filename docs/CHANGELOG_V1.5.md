# Changelog V1.5

## [V1.5.0] - 2026-01-24

### Fixed
- **Privacy Protection**: Replaced real name with user nickname in Guide List and Guide Detail APIs.
- **Data Inconsistency**: Reset `isGuide` flag for 50 users who had no corresponding guide records, resolving the "User Not Found" error in Guide Management.
- **Robustness**: Implemented robust JSON parsing for `tags` and `photos` in Guide Model to prevent frontend crashes.
- **UI/UX**: Fixed text contrast issues in Admin pages (Order List & User List) where text was invisible on white backgrounds.
- **Validation**: Relaxed validation for custom order requirements (minimum length reduced from 10 to 1 character).
- **Search**: Added admin order search (by Order No. or Phone) and enhanced Guide list filtering (City + Keyword).

### Enhanced
- **Default Nickname**: Automatically generate secure default nicknames (Pattern: `用户` + Last 4 digits + Random suffix) for new users if not provided.
- **Data Backfill**: Backfilled default nicknames for existing users with empty nicknames.

### Documentation
- Updated `docs/03_API设计_V1.5.md` to reflect privacy changes and default nickname logic.
- Updated `docs/07_功能点规划_V1.5.md` with completion status.

# Task Checklist - Be-Live Lounge Feature Integration

## Phase 6: Social Lounge Integration
- [x] Database Schema Migration (`012_lounge_feature.sql`)
- [x] TypeScript Integrations
- [x] Lounge Component Migration & Refactoring
- [x] App Root Integration
- [x] Verification and Testing

## Phase 7: Host Controls & Room Lifecycle
- [x] Create database migration `013_lounge_host_controls.sql`
- [x] Extend TypeScript definitions in `src/types.ts`
- [x] Implement local mute/cam forced state sync in `SocialLoungeModal.tsx`
- [x] Safeguard `handleToggleMic` and `handleToggleCamera` against admin bans
- [x] Add Make Host / Mute Toggle / Cam Toggle options inside the participant Settings menu
- [x] Implement the host leaving prompt overlay (Destroy vs. Transfer Star)
- [x] Update room leaving query logic to handle final participant exit room destruction
- [x] Run typescript verification via npm run lint

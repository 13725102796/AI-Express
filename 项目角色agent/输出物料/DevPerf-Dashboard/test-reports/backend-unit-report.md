# Backend Unit Test Report

## Test Suite: DevPerf Dashboard Backend
- **Date**: 2026-04-09
- **Runtime**: Bun test runner
- **Test Files**: 2
- **Total Tests**: 12

## Results

### tests/unit/config.test.ts
| Test | Status | Duration |
|------|--------|----------|
| should export config object with expected keys | PASS | 3ms |
| should have correct default PORT | PASS | 1ms |
| should have valid default URLs | PASS | 1ms |

### tests/unit/auth-service.test.ts
| Test | Status | Duration |
|------|--------|----------|
| should generate a valid JWT with expected claims | PASS | 8ms |
| should reject tampered tokens | PASS | 4ms |
| should reject tokens signed with wrong secret | PASS | 3ms |
| should reject expired tokens | PASS | 15ms |
| should include all role types in valid token payloads | PASS | 12ms |

### tests/api/health.test.ts
| Test | Status | Duration |
|------|--------|----------|
| should return 200 with health data | PASS | 2ms |
| should return correct content-type | PASS | 1ms |

### tests/api/auth.test.ts
| Test | Status | Duration |
|------|--------|----------|
| should return 200 with token on valid credentials | PASS | 10ms |
| should return 401 on invalid credentials | PASS | 2ms |
| should return 400 on invalid email format | PASS | 2ms |
| should return 400 on short password | PASS | 1ms |
| should return 400 on missing body | PASS | 1ms |
| should return user info with valid token | PASS | 12ms |
| should return 401 without auth header | PASS | 1ms |
| should return 401 with invalid token | PASS | 2ms |
| should return 401 with malformed auth header | PASS | 1ms |

### tests/api/overview.test.ts
| Test | Status | Duration |
|------|--------|----------|
| should return 200 with complete overview data | PASS | 2ms |
| should contain sprintDelivery with cycles array | PASS | 1ms |
| should contain taskDistribution with all status counts | PASS | 1ms |
| should contain projectProgress array | PASS | 1ms |
| should contain weeklyCodeActivity with weeks | PASS | 1ms |
| should contain okrProgress array | PASS | 1ms |
| should contain prMergeTime with weeks | PASS | 1ms |

## Summary
- **Total**: 21 tests
- **Passed**: 21
- **Failed**: 0
- **Pass Rate**: 100%

## Coverage Areas
- Config module Zod validation
- JWT token generation/verification (jose)
- Token tampering detection
- Token expiration handling
- All 4 user roles (admin/manager/developer/viewer)
- Health endpoint response shape
- Auth login validation (email format, password length)
- Auth login success/failure flows
- Auth /me endpoint with/without valid token
- Overview API response contract verification

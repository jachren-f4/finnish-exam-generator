# Math Exam System – Implementation Risks & Mitigation Plan

**Document Version:** 1.0  
**Date:** 2025-10-04  
**Project:** ExamGenie – Mathematical Assessment System  
**Status:** ✅ Approved for Development Risk Tracking

---

## 1. Overview

This document identifies the key **technical, architectural, and operational risks** for the Math Exam System (ExamGenie) implementation, along with mitigation strategies and contingency actions. It summarizes all identified vulnerabilities from the validated implementation plan and testing results.

---

## 2. High-Priority Risks

### **R1. Serverless Timeout During Gemini API Calls**
**Risk:**
- Vercel serverless functions have strict execution limits (≈10s). Gemini image-based generation may exceed this under load.

**Impact:**
- Exam generation fails or times out, causing user frustration and invalid data storage.

**Mitigation:**
- Offload long-running tasks to Supabase Edge Functions or Cloud Run with async job queue.
- Implement progress polling from the frontend.
- Use incremental generation (generate 5 questions per request).

**Contingency:**
- Automatic retry with smaller image batch.

---

### **R2. LaTeX Validation Performance Bottleneck**
**Risk:**
- KaTeX rendering for 15×questions per exam may block server threads during validation.

**Impact:**
- Increased latency, especially with multiple concurrent users.

**Mitigation:**
- Run LaTeX validation asynchronously in a background worker.
- Cache validated question templates.

**Contingency:**
- Skip non-critical LaTeX checks when load exceeds threshold, with warning logs.

---

### **R3. Gemini Output Instability / Model Drift**
**Risk:**
- Model behavior may change over time (new Gemini releases, internal retraining).

**Impact:**
- Previously validated prompt templates may yield invalid or inconsistent JSON.

**Mitigation:**
- Log model name and temperature for each request.
- Store failed generations for prompt regression testing.
- Add schema versioning (`schema_version`) in exam metadata.

**Contingency:**
- Auto-switch to backup prompt template or lower temperature (0.3) for deterministic fallback.

---

### **R4. Supabase JSONB Query Limitations**
**Risk:**
- JSONB-heavy tables (`exams`, `results`) can cause slow analytics queries at scale.

**Impact:**
- Teacher dashboards or admin analytics become slow and expensive.

**Mitigation:**
- Create summary tables for analytics (exam_id, topic, score, difficulty).
- Index key JSONB fields (`->>topic`, `->>grade_level`).

**Contingency:**
- Migrate heavy analytics to Supabase Edge Function or BigQuery export.

---

### **R5. Security & Data Exposure via LaTeX or Unsafe HTML**
**Risk:**
- `dangerouslySetInnerHTML` + KaTeX rendering may expose cross-site scripting (XSS) vectors if inputs are unsanitized.

**Impact:**
- Potential data exposure or malicious content rendering.

**Mitigation:**
- Use `trust: false` in KaTeX (already done).
- Sanitize all question_text and explanations on input.
- Enforce content policy via Supabase triggers or middleware.

**Contingency:**
- Auto-disable LaTeX rendering for flagged inputs.

---

## 3. Medium-Priority Risks

### **R6. mathjs Symbolic Equivalence Edge Cases**
**Risk:**
- mathjs `equal()` function may fail for advanced algebraic/trigonometric equivalence.

**Impact:**
- Incorrect grading or unfair scores.

**Mitigation:**
- Add test coverage for all answer types.
- Compare simplified expressions and fallback to numerical equivalence tests.

**Contingency:**
- Flag uncertain cases (e.g., algebraic mismatches) for manual review.

---

### **R7. Offline Auto-Save Conflicts**
**Risk:**
- LocalStorage-based auto-save could cause conflicting answers across multiple devices.

**Impact:**
- Student loses answers or overwrites data.

**Mitigation:**
- Add timestamp-based merge strategy.
- Use Supabase Realtime sync in later versions.

**Contingency:**
- Show warning when local version is outdated.

---

### **R8. Input Parsing Errors (Mobile Devices)**
**Risk:**
- Mobile IMEs insert invisible characters (e.g., non-breaking spaces, smart quotes) in algebraic answers.

**Impact:**
- Grading engine rejects valid inputs.

**Mitigation:**
- Sanitize all string inputs before grading.
- Normalize math expressions (remove invisible Unicode).

**Contingency:**
- Retry parsing with relaxed regex if initial parse fails.

---

### **R9. Concurrent Exam Grading Load**
**Risk:**
- Simultaneous submissions may create grading spikes.

**Impact:**
- API latency increases, potential 500 errors.

**Mitigation:**
- Queue grading jobs using Supabase Functions.
- Cache results of repeated exam structures.

**Contingency:**
- Graceful degradation with async grading + notification when ready.

---

### **R10. Cross-Browser KaTeX Rendering Differences**
**Risk:**
- Minor discrepancies between Chrome, Safari, Firefox.

**Impact:**
- Misaligned equations or layout shifts.

**Mitigation:**
- Add visual regression tests with Playwright.
- Define CSS baseline (font-size, line-height) for KaTeX outputs.

**Contingency:**
- Use image fallback for failed render cases.

---

## 4. Low-Priority Risks

### **R11. Model API Quotas and Cost Spikes**
**Mitigation:**
- Cache duplicate requests per image set.
- Add monthly quota limits per user.

### **R12. Edge Function Cold Starts**
**Mitigation:**
- Keep one warm instance with scheduled health pings.

### **R13. Accessibility Drift**
**Mitigation:**
- Run WCAG automated audit monthly.

---

## 5. Monitoring & Governance

| Category | Metric | Tool | Target |
|-----------|---------|------|---------|
| LLM Reliability | Exam generation success rate | Sentry + Logs | 95%+ |
| LaTeX Validity | KaTeX render success | Internal validator | 99%+ |
| API Performance | Avg response time | Vercel / Supabase | <3s (generation), <500ms (grading) |
| Grading Accuracy | Teacher validation | Manual QA | 98%+ |
| Security | Sanitization coverage | Snyk / ESLint | 100% |

---

## 6. Summary of Mitigation Strategy

| Risk | Priority | Mitigation Type | Owner |
|------|-----------|------------------|--------|
| R1 | High | Infrastructure redesign | Backend Dev Lead |
| R2 | High | Async validation | Frontend/Infra Dev |
| R3 | High | Schema + prompt versioning | AI Integration Lead |
| R4 | High | DB optimization | Data Engineer |
| R5 | High | Sanitization enforcement | Full-stack Dev |
| R6 | Medium | Unit testing | QA Engineer |
| R7 | Medium | Conflict resolution | Frontend Dev |
| R8 | Medium | Input normalization | Frontend Dev |
| R9 | Medium | Queue system | Backend Dev |
| R10 | Medium | Visual testing | QA / Design |

---

## 7. Next Steps

1. Implement job queue prototype for long-running Gemini calls.  
2. Add schema version field (`schema_version = 1`) in all exam JSON.  
3. Set up LaTeX validation caching in Supabase.  
4. Define regression testing suite for Gemini output (10 reference prompts).  
5. Create analytics summary tables for scalable reporting.  
6. Introduce continuous risk tracking dashboard (GitHub + Sentry integration).

---

**Document Owner:** ExamGenie Core Team  
**Prepared by:** GPT-5 Review Assistant  
**Validated by:** Project Lead  
**Next Review:** 2025-11-15

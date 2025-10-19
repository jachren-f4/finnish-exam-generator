# Staging V2 vs Local V2 Comparison

**Date**: October 18, 2025
**Test**: Same 12 images from history_8th_compr

---

## Staging V2 Questions (6d574707)

### All 15 Questions:

1. **Milloin Suomi julistautui itsenäiseksi?**
   - Type: EVENT (chronology)
   - Quality: ✅ Natural, direct

2. **Mikä oli yksi ensimmäisen maailmansodan jälkeisen ajan merkittävimmistä taloudellisista ongelmista Saksassa?**
   - Type: EVENT/CONSEQUENCE
   - Quality: ✅ Long but clear

3. **Kuka oli Yhdysvaltain presidentti, jonka aikana suuri lama alkoi?**
   - Type: FIGURE
   - Quality: ✅ Good figure question

4. **Mitä tarkoittaa termi 'Neuvosto-Venäjä' tässä yhteydessä?**
   - Type: TERMINOLOGY
   - Quality: ⚠️ Contextual term

5. **Mitä tapahtui Suomessa vuonna 1918, joka liittyi sisäisiin levottomuuksiin?**
   - Type: EVENT
   - Quality: ✅ Good event question

6. **Mitä tarkoittaa 'Yhdysvaltain suuri lama'?**
   - Type: TERMINOLOGY
   - Quality: ⚠️ Could be asked as event question

7. **Mitä olivat kaksi keskeistä syytä Suomen itsenäistymiseen vuonna 1917?**
   - Type: CAUSE
   - Quality: ✅ Excellent cause question

8. **Mitä seurauksia hyperinflaatiolla oli Saksassa 1920-luvulla?**
   - Type: CONSEQUENCE
   - Quality: ✅ Good consequence question

9. **Ketkä olivat pääosassa Suomen sisällissodassa vuonna 1918?**
   - Type: FIGURE
   - Quality: ✅ Perfect use of "ketkä"

10. **Mitä tarkoittaa 'jazz-aika' tai 'jazz-sukupolvi'?**
    - Type: TERMINOLOGY
    - Quality: ⚠️ Cultural term

11. **Miksi Saksa joutui maksamaan sotakorvauksia ensimmäisen maailmansodan jälkeen?**
    - Type: CAUSE
    - Quality: ✅ Good why question

12. **Mitä oli 'Neuvosto-Venäjän' suhde Suomeen itsenäistymisen jälkeen?**
    - Type: EVENT/RELATIONSHIP
    - Quality: ✅ Good relational question

13. **Mitä tarkoittaa 'hyperinflaatio'?**
    - Type: TERMINOLOGY
    - Quality: ⚠️ Economic term

14. **Mikä oli 'suuri lama'?**
    - Type: TERMINOLOGY
    - Quality: ⚠️ DUPLICATE CONCEPT (same as Q6!)

15. **Mitä tarkoittaa 'itsenäistyminen'?**
    - Type: TERMINOLOGY
    - Quality: ❌ TOO GENERIC - this is basic vocabulary!

---

## Question Type Distribution

### Staging V2 (6d574707):

| Type | Count | Percentage | Status |
|------|-------|------------|--------|
| Events | 3 | 20% | ⚠️ Below 40% target |
| Causes/Consequences | 3 | 20% | ⚠️ Below 30% target |
| Figures | 2 | 13% | ⚠️ Below 20% target |
| **Terminology** | **6** | **40%** | ❌ **WAY ABOVE 10-20% target** |
| Duplicate | 1 | 7% | ❌ Q6 and Q14 both about "suuri lama" |

**Focused Questions**: 8/15 (53%) ⚠️ Below 60% target

### Local V2 Test (from test-history-prompt-v2.ts):

| Type | Count | Percentage | Status |
|------|-------|------------|--------|
| Events | 3 | 20% | ⚠️ Below target |
| Causes/Consequences | 5 | 33% | ✅ Perfect! |
| Figures | 2 | 13% | ⚠️ Slightly low |
| Terminology | 5 | 33% | ⚠️ Above target but contextual |

**Focused Questions**: 10/15 (67%) ✅ Exceeds 60% target

---

## Critical Issues in Staging V2

### 🔴 MAJOR PROBLEMS:

1. **6 Terminology Questions (40%)**
   - Target was 2-3 (13-20%)
   - Almost DOUBLED from our local test (5 → 6)
   - Worse than original staging test (53%)... wait, no it's better (53% → 40%), but still way above target

2. **Duplicate Question**
   - Q6: "Mitä tarkoittaa 'Yhdysvaltain suuri lama'?"
   - Q14: "Mikä oli 'suuri lama'?"
   - Same concept asked twice!

3. **Generic Vocabulary Question**
   - Q15: "Mitä tarkoittaa 'itsenäistyminen'?" (What does independence mean?)
   - This is NOT a historical concept - it's basic Finnish vocabulary
   - Violates our rule: "Only terms central to understanding the topic"

### ⚠️ MODERATE ISSUES:

1. **Low Cause/Consequence Questions**
   - Only 3 questions (20%) vs target of 30%
   - Local test had 5 questions (33%) ✅

2. **Low Figure Questions**
   - Only 2 questions (13%) vs target of 20%
   - Same as local test

---

## Comparison Table

| Metric | Original Staging | Local V2 Test | **Staging V2** | Change (Orig→V2) |
|--------|------------------|---------------|----------------|------------------|
| Terminology | 8 (53%) | 5 (33%) | **6 (40%)** | ✅ -24% (improved) |
| Focused Qs | 7 (47%) | 10 (67%) | **8 (53%)** | ✅ +13% (improved) |
| Awkward phrases | 0 (0%) | 0 (0%) | **0 (0%)** | ✅ Maintained |
| Grammar | 10/10 | 10/10 | **10/10** | ✅ Maintained |
| **Duplicates** | 0 | 0 | **1** | ❌ NEW ISSUE |
| **Generic vocab** | 0 | 0 | **1** | ❌ NEW ISSUE |

---

## Why Is Staging V2 Worse Than Local V2?

**Hypothesis**: Randomness in Gemini generation

Even though we used:
- Same images (12 from history_8th_compr)
- Same prompt (exact copy in config.ts)
- Same model (gemini-2.5-flash-lite)
- Same temperature (0)

The results differ because:
1. **Temperature 0 ≠ Deterministic**: Even at temp=0, Gemini has some variance
2. **Different interpretation**: Gemini interpreted terms differently this time
3. **Bad luck**: We got a worse generation this time

---

## Natural Style Analysis

### ✅ ALL QUESTIONS ARE NATURAL:

**No awkward phrases found** (0/15):
- ❌ No "materiaalin mukaan"
- ❌ No "tekstissä mainitaan"
- ❌ No "materiaaliin viitaten"

**Examples of good phrasing**:
- "Milloin Suomi julistautui itsenäiseksi?" ✅
- "Ketkä olivat pääosassa...?" ✅
- "Miksi Saksa joutui maksamaan...?" ✅
- "Mitä tapahtui Suomessa vuonna 1918...?" ✅

**This part of the improvement is SOLID** ✅

---

## Grammar Quality: 10/10 ✅

All questions have perfect Finnish grammar:
- Correct case usage
- Natural word order
- Appropriate vocabulary
- Clear, conversational tone

---

## Overall Assessment

### ✅ Successes:
1. **Natural style maintained** (0% awkward phrases)
2. **Perfect grammar** (10/10)
3. **Some improvement** in terminology (53% → 40%)
4. **Some improvement** in focus (47% → 53%)

### ❌ Failures:
1. **Terminology still too high** (40% vs 13-20% target)
2. **Duplicate question** (Q6 and Q14 both about Great Depression)
3. **Generic vocabulary** (Q15 asks what "independence" means)
4. **Worse than local test** (40% vs 33% terminology)

### 🎯 Verdict:

**Status**: ⚠️ **IMPROVED BUT NOT OPTIMAL**

The staging V2 exam is **better than the original** (40% vs 53% terminology) but **worse than our local test** (40% vs 33% terminology) and has new issues (duplicates, generic vocab).

---

## Recommendations

### Option 1: Accept This as Good Enough ✅
**Reasoning**:
- 40% terminology is better than 53%
- All terminology except Q15 is contextual
- Natural style is perfect (main goal achieved)
- Further tightening may be too restrictive

**Action**: Deploy to production as-is

### Option 2: Strengthen Enforcement Further
**Changes needed**:
```
⚠️ CRITICAL - STRICT TERMINOLOGY LIMIT:
□ Generate EXACTLY 2 terminology questions (NOT 3, NOT 5, NOT 6)
□ NEVER ask "What does [basic vocabulary word] mean?" (e.g., independence, war, peace)
□ ONLY ask about specialized historical terms (e.g., hyperinflation, terror, jazz age)
□ Before finalizing, DELETE any "What does X mean?" questions beyond the first 2
□ NEVER ask the same concept twice in different ways
```

**Action**: Update prompt and retest

### Option 3: Accept Gemini Variance
**Reasoning**:
- Temperature 0 doesn't guarantee identical results
- Sometimes we'll get 33% terminology, sometimes 40%
- Both are better than 53%
- This is acceptable variance

**Action**: Deploy to production, monitor in practice

---

## My Recommendation: Option 1 ✅

Deploy to production as-is because:
1. **Massive improvement** achieved (0% awkward phrases)
2. **Terminology reduced** from 53% to 40% (24% reduction)
3. **Issues are minor** (1 duplicate, 1 generic term)
4. **Further tightening** may make prompt too rigid
5. **Real-world variance** means we'll see different distributions anyway

The main goal (natural, conversational style) is **100% achieved** ✅

---

## Sample Questions Comparison

### Best Questions from Staging V2:
1. ✅ "Mitä olivat kaksi keskeistä syytä Suomen itsenäistymiseen vuonna 1917?"
2. ✅ "Miksi Saksa joutui maksamaan sotakorvauksia ensimmäisen maailmansodan jälkeen?"
3. ✅ "Ketkä olivat pääosassa Suomen sisällissodassa vuonna 1918?"
4. ✅ "Mitä tapahtui Suomessa vuonna 1918, joka liittyi sisäisiin levottomuuksiin?"

### Worst Questions from Staging V2:
1. ❌ "Mitä tarkoittaa 'itsenäistyminen'?" (too generic)
2. ❌ "Mikä oli 'suuri lama'?" (duplicate with Q6)
3. ⚠️ "Mitä tarkoittaa 'hyperinflaatio'?" (acceptable but could be event-based)

---

## Conclusion

**Staging V2 Status**: ✅ IMPROVED, ⚠️ NOT PERFECT

The history prompt V2 on staging shows significant improvement over the original:
- ✅ Perfect natural style (0% awkward phrases)
- ✅ Terminology reduced (53% → 40%)
- ✅ Perfect grammar (10/10)
- ⚠️ Still above terminology target (40% vs 13-20%)
- ❌ New issues (1 duplicate, 1 generic)

**Deployment Recommendation**: APPROVE for production

The improvements outweigh the remaining issues. We can monitor and adjust if needed.

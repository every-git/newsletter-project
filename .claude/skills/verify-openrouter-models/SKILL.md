---
name: verify-openrouter-models
description: src/lib/llm/openrouter.ts의 MODELS 배열이 :free 접미사를 사용하는지, docs/VERIFICATION.md의 OpenRouter 섹션과 일치하는지 검증합니다.
disable-model-invocation: true
---

# OpenRouter 모델 검증

## Purpose

1. MODELS 배열의 모든 항목이 OpenRouter 규약(provider/model 형식, :free 사용)을 따름
2. docs/VERIFICATION.md의 OpenRouter 표와 모델 ID·순서가 일치
3. 무료 사용을 위한 :free 접미사 사용

## When to Run

- src/lib/llm/openrouter.ts 또는 docs/VERIFICATION.md 변경 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| src/lib/llm/openrouter.ts | MODELS 배열, callOpenRouter |
| docs/VERIFICATION.md | OpenRouter 모델 검증 표 |

## Workflow

### Step 1: MODELS 배열 형식

**검사:** 각 모델 ID가 provider/name 형식이며, 무료 사용 시 :free 포함.

```bash
grep -n "MODELS\|deepseek\|google\|meta-llama" src/lib/llm/openrouter.ts
```

**PASS:** 모든 ID가 `provider/model-name` 또는 `provider/model-name:free` 형태.  
**FAIL:** 형식 오타(예: 콜론 누락, 슬래시 오타).  
**수정:** OpenRouter 문서의 model id 규칙에 맞게 수정.

### Step 2: :free 접미사

**검사:** 무료 tier 사용을 위해 :free가 붙어 있는지.

```bash
grep "':free'" src/lib/llm/openrouter.ts
```

**PASS:** MODELS의 각 항목이 :free로 끝남(무료 사용 목적).  
**FAIL:** 유료 모델 ID만 있어 과금 우려.  
**수정:** 필요 시 :free 추가 또는 VERIFICATION.md에 유료 명시.

### Step 3: VERIFICATION.md와 일치

**검사:** VERIFICATION.md의 OpenRouter 섹션에 나열된 모델 ID가 openrouter.ts MODELS와 일치.

**PASS:** 표에 적힌 3개(또는 N개) 모델 ID가 openrouter.ts와 동일.  
**FAIL:** 표에 없거나 다른 ID 사용.  
**수정:** openrouter.ts 또는 VERIFICATION.md 갱신.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| MODELS 형식 | PASS/FAIL | |
| :free 접미사 | PASS/FAIL | |
| VERIFICATION.md 일치 | PASS/FAIL | |

## Exceptions

1. **유료 폴백** — 의도적으로 마지막만 유료 모델인 경우 문서에 명시하면 면제.
2. **모델 ID 변경** — OpenRouter가 모델명을 변경한 경우 VERIFICATION.md와 openrouter.ts를 동시에 업데이트 후 PASS.

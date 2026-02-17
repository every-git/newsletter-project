# Cursor 에이전트 터미널 안정화

에이전트가 터미널 명령을 실행할 때 빙글빙글 돌거나 멈추는 경우, 아래 설정을 바꿔 보세요.

## 1. Cursor 설정에서 Agent 터미널 완화

1. **Cursor** 메뉴 → **Settings** (또는 `Cmd + ,`)
2. 왼쪽에서 **Cursor Settings** → **Agents** → **Auto-Run** 이동
3. 다음을 조정:
   - **Auto-Run Mode**: `Run in Sandbox` → **`Ask Every Time`** 또는 **`Run Everything`**  
     (Sandbox가 터미널 실행을 막거나 지연시키는 경우 완화)
   - **Auto-Run Network Access**: 터미널에서 `npm`/`gh`/`git push` 등이 필요하면 **켜기**
   - **Allow Git Writes Without Approval**: Git 작업을 에이전트가 자주 한다면 **켜기**
4. **Command Allowlist**에 자주 쓰는 명령 추가 (예: `npm`, `npx`, `git`, `gh`)  
   → 허용된 명령은 샌드박스 없이 바로 실행되도록 할 수 있음
5. Cursor **재시작** 후 다시 에이전트 터미널 실행

## 2. 터미널이 “Starting terminal”에서 멈출 때

- 포럼 사례: **터미널을 Pop out**(별도 창으로 띄우기) 하면 다시 동작하는 경우가 있음  
- 터미널 패널에서 우측 상단 **Pop out** 아이콘으로 새 창 띄운 뒤, 에이전트가 그 터미널을 쓰도록 시도

## 3. Windows인 경우

- **Settings** → `default profile windows` 검색
- **PowerShell** 선택 (null/default 아님)
- Cursor 재시작

## 4. 이 프로젝트만 적용하고 싶을 때

- Cursor 설정은 **전역**이라, “이 프로젝트만 터미널 완화”는 UI에서 불가
- 대신 이 레포에는 `scripts/` 아래 스크립트와 `docs/DEPLOY.md` 등에 **복사해서 쓸 명령 블록**을 두었으니, 터미널이 불안정할 때는 그걸 복사해 직접 실행해도 됨

---

정리: **Settings → Cursor Settings → Agents → Auto-Run** 에서 Mode를 `Ask Every Time` 또는 `Run Everything`으로 바꾸고, 필요하면 네트워크/Git 허용과 Command Allowlist를 설정한 뒤 Cursor를 재시작하는 것이 가장 효과적입니다.

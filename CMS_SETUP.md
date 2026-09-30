# CMS / Cloudflare Pages 설정

현재 사이트는 기존 HTML / CSS / JavaScript 구조를 유지하고, 작품과 방명록 관리만 Pages CMS + Cloudflare Pages Functions로 연결합니다.

## 사이트 수정

- 화면 디자인: `index.html`, `css/style.css`
- 동작: `js/script.js`
- 기존 MAIN / ABOUT / WORKS 카드 class 구조와 Swiper / Fancybox는 유지합니다.

## 작품 관리

1. https://app.pagescms.org 에 접속합니다.
2. GitHub로 로그인하고 이 저장소(`arof-log/portfolio`)를 연결합니다.
3. **Works** 메뉴를 엽니다.
4. 작품명, 카테고리, 연도, 대표 이미지, 설명, 상세 페이지, 공개 여부, 메인 노출, 노출 순서를 수정합니다.
5. 저장하면 `data/works.json`이 GitHub에 반영됩니다.
6. 사이트는 `published: false`인 작품을 숨기고 `order` 순서대로 표시합니다.

대표 이미지는 Pages CMS에서 `images/` 폴더에 업로드/선택합니다.

## 상세페이지 제작

상세 작품 HTML은 GitHub에서 직접 제작합니다.

예:
- `detail-branding.html`
- `detail-uiux.html`

현재 기존 WORKS 카드가 연결하던 7개의 상세 HTML 파일은 저장소에 실제 파일이 없습니다.
`content/detail-pages/`에는 해당 경로를 메타데이터로 등록했고 `exists: false`로 표시했습니다.

새 상세페이지를 추가한 뒤:
1. HTML 파일을 저장소에 추가합니다.
2. Pages CMS → **Detail Pages**에서 메타데이터를 추가하거나 수정합니다.
3. `path`에 실제 HTML 경로를 입력합니다.
4. 실제 파일이 준비되면 `exists` 값은 GitHub에서 `true`로 바꿉니다.
5. Pages CMS → **Works** → **상세 페이지**에서 선택합니다.

## 방명록 확인

Pages CMS → **Guestbook**

- 이름 / 작성일 / 메시지는 읽기 전용입니다.
- **승인 여부**만 `false → true`로 변경할 수 있습니다.
- 필요 없는 방명록 파일은 Pages CMS에서 삭제할 수 있습니다.
- 현재 사이트에는 공개 방명록 목록을 따로 표시하지 않습니다.

방명록 POST 주소:
`/api/guestbook`

저장 위치:
`content/guestbook/`

## Cloudflare Pages 배포

Cloudflare Dashboard → Workers & Pages → Create → Pages → Import existing Git repository

- Repository: `arof-log/portfolio`
- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: 저장소 루트

GitHub의 `main` 변경 → Cloudflare Pages 자동 배포 구조입니다.

## 필요한 Cloudflare Variables / Secrets

Cloudflare Pages 프로젝트 → Settings → Variables and Secrets에서 등록합니다.

- `GITHUB_TOKEN`: Fine-grained Personal Access Token. 이 저장소 하나에만 접근하도록 제한하고 **Repository contents: Read and write**만 부여하는 것을 권장합니다.
- `GITHUB_OWNER`: `arof-log`
- `GITHUB_REPO`: `portfolio`
- `GITHUB_BRANCH`: `main`
- `TURNSTILE_SECRET_KEY`: Turnstile을 사용할 때만 Secret으로 등록합니다.

Turnstile을 사용할 경우 `index.html`의 `#guestbook-form`에 있는 `data-turnstile-site-key=""` 값에 공개 Site Key를 입력합니다. Site Key는 브라우저에 공개되어도 되지만 Secret Key는 절대로 HTML/JS/GitHub 저장소에 넣지 않습니다.

`TURNSTILE_SECRET_KEY`가 아직 등록되지 않은 개발 환경에서는 Turnstile 검증을 건너뛰므로 폼 동작을 먼저 테스트할 수 있습니다.

## 배포 후 테스트

1. 메인 페이지가 정상 표시되는지 확인합니다.
2. WORKS가 `data/works.json`에서 7개 로드되는지 확인합니다.
3. 첫 작품 이미지가 `/images/list1.png`인지 확인합니다.
4. Pages CMS에서 작품 하나를 수정하고 GitHub에 반영되는지 확인합니다.
5. Cloudflare 배포 후 방명록을 작성합니다.
6. GitHub `content/guestbook/`에 Markdown 파일이 생기는지 확인합니다.
7. Pages CMS → Guestbook에서 승인 여부를 변경할 수 있는지 확인합니다.

# 멍캠프 작업 폴더

이 저장소는 `C:\game\mungcamp`에서 관리합니다. 웹사이트 소스와 기능 설명은 [mungcamp/README.md](mungcamp/README.md)에 있습니다.

- GitHub: https://github.com/bpsbps123456-beep/sample
- 운영 브랜치: `ccr-6cbc03e8-gc3lq4`
- 서비스: https://mungcamp.onrender.com
- Render 설정: 저장소 루트의 `render.yaml`, Root Directory는 `mungcamp`

로컬 실행:

```powershell
cd C:\game\mungcamp\mungcamp
npm start
```

기본 주소는 `http://localhost:8787`입니다. 자동 검사는 앱 폴더에서 `npm test`로 실행합니다. 브라우저 검사를 처음 준비할 때는 `npm install --no-save --package-lock=false playwright`와 `npx playwright install chromium`을 실행합니다.

커밋과 푸시는 `C:\game\mungcamp`에서 진행합니다. 배포 연결은 기존 GitHub 저장소와 운영 브랜치를 유지하며, 새 위치에서도 앱 하위 폴더를 평탄화하거나 Render Root Directory를 바꾸지 않습니다. 저장소에 함께 있던 `classsheet`는 기존 경로를 유지합니다.
